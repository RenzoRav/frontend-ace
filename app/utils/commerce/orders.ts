import type {
  BusinessState,
  Order,
  QuoteInput,
  OperationContext,
  ClientAddress,
  OrderStatus,
  FinancialMovement,
} from "../../types/index.ts";
import { quoteOrder, cents } from "./pricing.ts";
import {
  initializeCollections,
  refreshSales,
  history,
  recordAudit,
} from "./state.ts";
import { today, splitInstallments } from "../domain.ts";
export const systemContext = (): OperationContext => ({
  now: new Date().toISOString(),
  actorId: null,
  origin: "system",
});
export function transaction<T>(
  state: BusinessState,
  action: (draft: BusinessState) => T,
): T {
  const draft = initializeCollections(JSON.parse(JSON.stringify(state)));
  const result = action(draft);
  refreshSales(draft);
  Object.assign(state, draft);
  return result;
}
function audit(
  state: BusinessState,
  c: OperationContext,
  action: string,
  id: string,
) {
  recordAudit(state, c, action, "Pedido", id);
}
function cash(state: BusinessState, input: Omit<FinancialMovement, "id">) {
  if (input.amount === 0) return;
  if (
    input.operationKey &&
    state.financialMovements!.some((m) => m.operationKey === input.operationKey)
  )
    return;
  cents(input.amount);
  state.financialMovements!.unshift({ ...input, id: crypto.randomUUID() });
}
function confirm(state: BusinessState, order: Order, c: OperationContext) {
  if (order.stockEffect === "legacy-unknown")
    throw Error(
      "Pedido legado com baixa desconhecida. Revise o histórico antes de movimentar estoque.",
    );
  if (order.accountedAt) return;
  if (!order.paymentMethod)
    throw Error("Escolha a forma de pagamento antes de confirmar.");
  for (const i of order.items) {
    const p = state.products.find((p) => p.id === i.productId);
    if (!p || p.status !== "active" || p.stock < i.quantity)
      throw Error(
        "Quantidade indisponível em estoque. Nenhum registro foi alterado.",
      );
  }
  for (const i of order.items) {
    state.products.find((p) => p.id === i.productId)!.stock -= i.quantity;
    state.movements.unshift({
      id: crypto.randomUUID(),
      orderId: order.id,
      productId: i.productId,
      type: "Saída",
      quantity: i.quantity,
      date: today(),
      reason: order.number,
    });
  }
  order.stockEffect = "applied";
  order.accountedAt = c.now;
  if (
    ["Parcelado", "Cartão"].includes(order.paymentMethod || "") &&
    order.total > 0
  ) {
    const count = order.installmentCount || 3;
    const schedule = splitInstallments(
      order.total,
      count,
      order.firstDueDate || order.date,
    );
    state.installments.push(
      ...schedule.map((portion, index) => ({
        ...portion,
        id: crypto.randomUUID(),
        orderId: order.id,
        saleId: order.legacySaleId || order.id,
        customerId: order.customerId,
        number: index + 1,
        count,
        paidAt: null,
        cancelledAt: null,
      })),
    );
  }
}
function create(
  state: BusinessState,
  customerId: string,
  input: QuoteInput,
  c: OperationContext,
  details?: {
    delivery?: "Entrega" | "Retirada";
    address?: ClientAddress | null;
    source?: "store" | "direct";
  },
) {
  if (!state.customers.some((customer) => customer.id === customerId))
    throw Error("Selecione um cliente.");
  if (details?.delivery === "Entrega" && !details.address)
    throw Error("Selecione um endereço para entrega.");
  const quote = quoteOrder(state, input),
    id = crypto.randomUUID();
  const numbers = state.orders
    .map((o) => Number(o.number.replace(/^[PV]-/, "")))
    .filter(Number.isFinite);
  const order: Order = {
    id,
    number: "P-" + String(Math.max(0, ...numbers) + 1).padStart(4, "0"),
    customerId,
    date: input.date || today(),
    createdAt: c.now,
    status: "Novo",
    paymentMethod: input.paymentMethod,
    paymentStatus: "Pendente",
    ...quote,
    items: quote.items.map((i) => ({
      ...i,
      id: crypto.randomUUID(),
      orderId: id,
    })),
    installmentCount: input.installmentCount || 3,
    firstDueDate: input.firstDueDate || input.date || today(),
    stockEffect: "none",
    accountedAt: null,
    legacySaleId: null,
    source: details?.source || "store",
    delivery: details?.delivery || "Retirada",
    address: details?.address
      ? JSON.parse(JSON.stringify(details.address))
      : null,
    stage: 0,
  };
  state.orders.unshift(order);
  history(state, order, "", c);
  audit(state, c, "Criar pedido", id);
  return order;
}
export function createCommerceOrder(
  state: BusinessState,
  customerId: string,
  input: QuoteInput,
  c = systemContext(),
  details?: {
    delivery?: "Entrega" | "Retirada";
    address?: ClientAddress | null;
    source?: "store" | "direct";
  },
) {
  return transaction(state, (draft) =>
    create(draft, customerId, input, c, details),
  );
}
function transition(
  state: BusinessState,
  order: Order,
  next: OrderStatus,
  c: OperationContext,
) {
  const previous = order.status;
  if (previous === next) return order;
  const allowed: Record<OrderStatus, OrderStatus[]> = {
    Novo: ["Confirmado", "Cancelado"],
    Confirmado: ["Em preparação", "Finalizado", "Cancelado"],
    "Em preparação": ["Finalizado", "Cancelado"],
    Finalizado: [],
    Cancelado: [],
  };
  if (!allowed[previous]?.includes(next))
    throw Error("Transição de status não permitida.");
  if (next === "Confirmado") confirm(state, order, c);
  if (next === "Cancelado") {
    if (order.stockEffect === "applied") {
      for (const i of order.items) {
        const p = state.products.find((p) => p.id === i.productId);
        if (!p) throw Error("Produto não encontrado para estornar o estoque.");
        p.stock += i.quantity;
        state.movements.unshift({
          id: crypto.randomUUID(),
          orderId: order.id,
          productId: i.productId,
          type: "Entrada",
          quantity: i.quantity,
          date: today(),
          reason: "Estorno " + order.number,
        });
      }
      order.stockEffect = "reversed";
    }
    for (const p of state.installments.filter(
      (p) => p.orderId === order.id && !p.paidAt,
    ))
      p.cancelledAt = c.now;
    for (const m of [...state.financialMovements!].filter(
      (m) =>
        m.orderId === order.id &&
        m.source === "payment" &&
        m.type === "Entrada",
    ))
      cash(state, {
        ...m,
        type: "Saída",
        source: "refund",
        date: today(),
        description: "Estorno " + order.number,
        operationKey: "refund:" + m.id,
      });
    if (
      order.paymentStatus === "Aprovado" ||
      state.financialMovements!.some(
        (m) => m.orderId === order.id && m.source === "refund",
      )
    )
      order.paymentStatus = "Estornado";
  }
  order.status = next;
  if (next === "Confirmado") order.stage = 1;
  if (next === "Em preparação") order.stage = Math.max(2, order.stage || 0);
  if (next === "Finalizado") order.stage = 4;
  history(state, order, previous, c);
  audit(state, c, "Status: " + next, order.id);
  return order;
}
export function transitionOrder(
  state: BusinessState,
  id: string,
  next: OrderStatus,
  c = systemContext(),
) {
  return transaction(state, (draft) => {
    const order = draft.orders.find((o) => o.id === id);
    if (!order) throw Error("Pedido não encontrado.");
    return transition(draft, order, next, c);
  });
}
function payment(
  state: BusinessState,
  order: Order,
  outcome: "Aprovado" | "Pendente" | "Recusado",
  c: OperationContext,
) {
  if (order.status === "Cancelado")
    throw Error("Pedido cancelado não recebe pagamento.");
  if (order.paymentStatus === "Aprovado") return order;
  if (outcome === "Aprovado") {
    if (!order.accountedAt && order.status === "Novo")
      transition(state, order, "Confirmado", c);
    if (!order.accountedAt)
      throw Error("Pedido legado sem contabilização comprovada.");
    if (!["Parcelado", "Cartão"].includes(order.paymentMethod || ""))
      cash(state, {
        orderId: order.id,
        installmentId: null,
        type: "Entrada",
        description: "Recebimento " + order.number,
        amount: order.total,
        date: today(),
        source: "payment",
        operationKey: "payment:" + order.id,
      });
  }
  order.paymentStatus = outcome;
  audit(state, c, "Pagamento: " + outcome, order.id);
  return order;
}
export function recordOrderPayment(
  state: BusinessState,
  id: string,
  outcome: "Aprovado" | "Pendente" | "Recusado",
  c = systemContext(),
) {
  return transaction(state, (draft) => {
    const o = draft.orders.find((o) => o.id === id);
    if (!o) throw Error("Pedido não encontrado.");
    return payment(draft, o, outcome, c);
  });
}
export function completeDirectSale(
  state: BusinessState,
  customerId: string,
  input: QuoteInput,
  c = systemContext(),
) {
  return transaction(state, (draft) => {
    const order = create(draft, customerId, input, c, { source: "direct" });
    transition(draft, order, "Confirmado", c);
    payment(draft, order, "Aprovado", c);
    transition(draft, order, "Finalizado", c);
    return order;
  });
}
export function recordInstallmentPayment(
  state: BusinessState,
  id: string,
  c = systemContext(),
) {
  return transaction(state, (draft) => {
    const p = draft.installments.find((i) => i.id === id);
    if (!p) throw Error("Parcela não encontrada.");
    if (p.paidAt) return;
    if (p.cancelledAt) throw Error("Parcela cancelada.");
    if (
      !p.orderId ||
      !draft.orders.some((o) => o.id === p.orderId && o.status !== "Cancelado")
    )
      throw Error("Parcela sem pedido válido.");
    cash(draft, {
      orderId: p.orderId,
      installmentId: p.id,
      type: "Entrada",
      description: "Parcela " + p.number,
      amount: p.amount,
      date: today(),
      source: "payment",
      operationKey: "installment:" + p.id,
    });
    p.paidAt = today();
    recordAudit(draft, c, "Receber parcela", "Parcela", p.id);
  });
}
export function advanceOrderStage(
  state: BusinessState,
  id: string,
  c = systemContext(),
) {
  return transaction(state, (draft) => {
    const order = draft.orders.find((o) => o.id === id);
    if (
      !order ||
      order.status === "Cancelado" ||
      order.paymentStatus !== "Aprovado"
    )
      throw Error("Aprove o pagamento antes de avançar o atendimento.");
    const stage = Math.min(4, (order.stage || 1) + 1);
    if (order.status === "Finalizado") return order;
    transition(draft, order, stage === 4 ? "Finalizado" : "Em preparação", c);
    order.stage = stage;
    return order;
  });
}

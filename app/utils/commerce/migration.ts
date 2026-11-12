import { validateSettings } from "./settings.ts";
import type { BusinessState, Order, PaymentMethod } from "../../types/index.ts";
import { initializeCollections, refreshSales } from "./state.ts";
import {
  validateCoupon,
  validatePromotion,
  validateRate,
  cents,
} from "./pricing.ts";
import { normalizePhone, validDate } from "./catalog.ts";
const core = [
  "products",
  "customers",
  "orders",
  "movements",
  "installments",
] as const;
export function migrateState(
  input: unknown,
  flow?: any,
  classification?: { brands: any[]; categories: any[] },
): BusinessState {
  if (
    !input ||
    typeof input !== "object" ||
    !core.every((k) => Array.isArray((input as any)[k]))
  )
    throw Error("Dados locais inválidos; a cópia original foi preservada.");
  const state: BusinessState = JSON.parse(JSON.stringify(input));
  const originalVersion = state.schemaVersion;
  const oldSales = state.sales || [];
  for (const key of [
    "brands",
    "categories",
    "coupons",
    "promotions",
    "productPromotions",
    "interestRates",
    "financialMovements",
    "billingRecords",
    "birthdayBenefits",
    "gifts",
    "managers",
    "auditLogs",
    "statusHistory",
    "migrationIssues",
  ]) {
    if ((state as any)[key] != null && !Array.isArray((state as any)[key]))
      throw Error("Coleção local inválida: " + key);
  }
  initializeCollections(state);
  state.settings = validateSettings(state.settings!);
  if (!state.brands!.length && classification)
    state.brands = structuredClone(classification.brands);
  if (!state.categories!.length && classification)
    state.categories = structuredClone(classification.categories);
  for (const m of state.financialMovements!) {
    if (
      !m ||
      typeof m.id !== "string" ||
      !Number.isFinite(m.amount) ||
      m.amount <= 0 ||
      !["Entrada", "Saída"].includes(m.type) ||
      !validDate(m.date.slice(0, 10)) ||
      (m.orderId && !state.orders.some((o) => o.id === m.orderId))
    )
      throw Error("Lançamento financeiro inválido.");
  }
  const issue = (kind: string, entityId: string, message: string) => {
    const id = `${kind}:${entityId}`;
    if (!state.migrationIssues!.some((i) => i.id === id))
      state.migrationIssues!.push({ id, kind, entityId, message });
  };
  const ids = new Set<string>();
  const customers = new Set<string>();
  for (const c of state.customers) {
    if (
      !c ||
      typeof c.id !== "string" ||
      typeof c.name !== "string" ||
      typeof c.phone !== "string"
    )
      throw Error("Cadastro de cliente inválido.");
    if (customers.has(c.id))
      throw Error("Identificadores de cliente duplicados.");
    customers.add(c.id);
    try {
      c.phone = normalizePhone(c.phone);
      if (ids.has(c.phone))
        issue(
          "phone",
          c.id,
          "Telefone duplicado: revise os cadastros sem unir pessoas automaticamente.",
        );
      ids.add(c.phone);
    } catch {
      issue("phone", c.id, "Telefone inválido: corrija o cadastro.");
    }
  }
  const products = new Set(state.products.map((p) => p.id));
  for (const p of state.products) {
    if (
      !p ||
      typeof p.id !== "string" ||
      ![p.costPrice, p.salePrice, p.stock, p.minimumStock].every(
        (n) => Number.isFinite(n) && n >= 0,
      ) ||
      !Number.isInteger(p.stock)
    )
      throw Error("Produto ou saldo inválido.");
    p.description ??= "";
  }
  if (originalVersion !== 2) {
    for (const sale of oldSales) {
      let id = `sale:${sale.id}`;
      while (state.orders.some((o) => o.id === id)) id = `legacy:${id}`;
      const order: Order = {
        ...sale,
        id,
        number: sale.number.replace(/^V-/, "P-"),
        status: "Finalizado",
        legacySaleId: sale.id,
        paymentStatus:
          sale.paymentMethod === "Parcelado" ? "Pendente" : "Aprovado",
        subtotal: sale.total,
        discount: 0,
        interest: 0,
        shipping: 0,
        source: "legacy-sale",
        stockEffect: "applied",
        accountedAt: sale.date,
        createdAt: sale.date,
        legacy: true,
      };
      state.orders.push(order);
      for (const installment of state.installments.filter(
        (i) => i.saleId === sale.id,
      ))
        installment.orderId = id;
      for (const movement of state.movements.filter(
        (m) => m.reason === sale.number,
      ))
        movement.orderId = id;
    }
  }
  const orderIds = new Set<string>();
  for (const order of state.orders) {
    if (
      !order ||
      typeof order.id !== "string" ||
      !Array.isArray(order.items) ||
      !Number.isFinite(order.total) ||
      order.total < 0 ||
      !validDate(order.date)
    )
      throw Error("Pedido inválido.");
    if (orderIds.has(order.id))
      throw Error("Identificadores de pedido duplicados.");
    orderIds.add(order.id);
    if (!customers.has(order.customerId))
      issue("customer", order.id, "Pedido com cliente não encontrado.");
    const record = originalVersion !== 2 ? flow?.records?.[order.id] : null;
    const wasLegacy = !order.source;
    order.source ??= "legacy-order";
    order.stockEffect ??=
      order.status === "Novo" || order.status === "Cancelado"
        ? "none"
        : "legacy-unknown";
    order.legacy ??= wasLegacy;
    order.subtotal ??= order.total;
    order.discount ??= 0;
    order.interest ??= 0;
    order.shipping ??= record?.shipping || 0;
    if (record) {
      order.total =
        Math.round(
          (order.subtotal -
            order.discount +
            order.interest +
            (order.shipping || 0)) *
            100,
        ) / 100;
      order.paymentMethod = record.method as PaymentMethod;
      order.paymentStatus = record.payment;
      order.delivery = record.delivery;
      order.address = record.address;
      order.stage = record.stage;
    }
    order.paymentStatus ??= "Pendente";
    order.paymentMethod ??= null;
    order.createdAt ??= order.date;
    order.items = order.items.map((item, index) => {
      const p = state.products.find((p) => p.id === item.productId);
      if (!products.has(item.productId))
        issue(
          "product",
          order.id,
          "Pedido com produto não encontrado; snapshot preservado.",
        );
      if (
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        !Number.isFinite(item.unitPrice) ||
        item.unitPrice < 0
      )
        throw Error("Item de pedido inválido.");
      return {
        ...item,
        id: item.id || `${order.id}:item:${index}`,
        orderId: order.id,
        name:
          item.name ||
          record?.items?.[index]?.name ||
          p?.name ||
          "Produto legado",
        costPrice: item.costPrice ?? null,
        brandId: item.brandId || p?.brandId,
        categoryId: item.categoryId || p?.categoryId,
      };
    });
    if (order.stockEffect === "legacy-unknown")
      issue(
        "stock",
        order.id,
        "Atendimento legado: baixa de estoque desconhecida. Consulte sem gerar efeitos retroativos.",
      );
  }
  for (const installment of state.installments) {
    if (
      !Number.isFinite(installment.amount) ||
      installment.amount <= 0 ||
      !validDate(installment.dueDate)
    )
      throw Error("Parcela inválida.");
    if (!installment.orderId || !orderIds.has(installment.orderId))
      issue("installment", installment.id, "Parcela sem pedido comprovado.");
  }
  for (const m of state.movements) {
    if (!Number.isInteger(m.quantity) || m.quantity < 0)
      throw Error("Movimentação de estoque inválida.");
    if (m.type === "Ajuste") m.legacyAdjustment = true;
  }
  const collections = [
    "brands",
    "categories",
    "coupons",
    "promotions",
    "interestRates",
    "financialMovements",
    "billingRecords",
    "birthdayBenefits",
    "gifts",
    "managers",
    "auditLogs",
    "statusHistory",
  ] as const;
  for (const key of collections) {
    const seen = new Set<string>();
    for (const record of state[key]!) {
      if (
        !record ||
        typeof record.id !== "string" ||
        !record.id ||
        seen.has(record.id)
      )
        throw Error("Identidade inválida na coleção " + key);
      seen.add(record.id);
    }
  }
  for (const c of state.coupons!) validateCoupon(c, state.coupons!);
  for (const p of state.promotions!) validatePromotion(p);
  for (const r of state.interestRates!) validateRate(r, state.interestRates!);
  for (const key of ["brands", "categories"] as const) {
    const names = new Set<string>();
    for (const item of state[key]!) {
      if (
        typeof item.name !== "string" ||
        !item.name.trim() ||
        names.has(item.name.trim().toLowerCase())
      )
        throw Error("Nome de classificação inválido ou duplicado.");
      names.add(item.name.trim().toLowerCase());
    }
  }
  const links = new Set<string>();
  for (const link of state.productPromotions!) {
    const id = link.productId + ":" + link.promotionId;
    if (links.has(id)) throw Error("Vínculo de promoção repetido.");
    links.add(id);
    if (
      !products.has(link.productId) ||
      !state.promotions!.some((p) => p.id === link.promotionId)
    )
      issue("promotion", id, "Promoção com vínculo órfão.");
  }
  const timestamp = (value: unknown) =>
    typeof value === "string" &&
    validDate(value.slice(0, 10)) &&
    Number.isFinite(Date.parse(value));
  for (const b of state.billingRecords!) {
    if (typeof b.message !== "string" || !timestamp(b.sentAt))
      throw Error("Registro de cobrança inválido.");
    if (!state.installments.some((p) => p.id === b.installmentId))
      issue("billing", b.id, "Cobrança com parcela não encontrada.");
  }
  for (const b of state.birthdayBenefits!) {
    if (
      !Number.isInteger(b.year) ||
      b.year < 1900 ||
      b.year > 9999 ||
      !timestamp(b.grantedAt)
    )
      throw Error("Benefício inválido.");
    if (
      !customers.has(b.customerId) ||
      (b.couponId && !state.coupons!.some((c) => c.id === b.couponId))
    )
      issue("benefit", b.id, "Benefício com referência não encontrada.");
  }
  for (const g of state.gifts!) {
    if (
      typeof g.description !== "string" ||
      !g.description.trim() ||
      !validDate(g.date)
    )
      throw Error("Brinde inválido.");
    if (!customers.has(g.customerId))
      issue("gift", g.id, "Brinde com cliente não encontrado.");
  }
  for (const h of state.statusHistory!) {
    if (
      !timestamp(h.date) ||
      !["manager", "customer", "system"].includes(h.origin)
    )
      throw Error("Histórico de status inválido.");
    if (
      !orderIds.has(h.orderId) ||
      (h.actorId && !state.managers!.some((m) => m.id === h.actorId))
    )
      issue("history", h.id, "Histórico com referência não encontrada.");
  }
  for (const a of state.auditLogs!) {
    if (
      typeof a.action !== "string" ||
      typeof a.entity !== "string" ||
      !timestamp(a.date)
    )
      throw Error("Auditoria inválida.");
    if (!state.managers!.some((m) => m.id === a.actorId))
      issue("audit", a.id, "Auditoria com gestora não encontrada.");
  }
  for (const o of state.orders) {
    for (const value of [
      o.subtotal,
      o.discount,
      o.interest,
      o.shipping,
      o.total,
    ])
      cents(value ?? 0);
    for (const i of o.items) if (i.costPrice != null) cents(i.costPrice);
  }
  refreshSales(state);
  return state;
}
export function persistedState(state: BusinessState) {
  const { sales: _derived, ...data } = state;
  return data;
}
export function backupLegacy(storage: Pick<Storage, "getItem" | "setItem">) {
  if (!storage.getItem("loja-backup-v1")) {
    const originals = Object.fromEntries(
      ["loja-v1", "loja-flow-v1", "loja-client-v1", "loja-cart-v1"].map((k) => [
        k,
        storage.getItem(k),
      ]),
    );
    storage.setItem("loja-backup-v1", JSON.stringify(originals));
  }
}

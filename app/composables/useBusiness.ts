import { archiveDemoProduct } from "~/utils/commerce/product-archive";
import { emptyBusiness } from "~/utils/api/adapters";
import { defaultSettings, validateSettings } from "~/utils/commerce/settings";
import type { StoreSettings } from "~/utils/commerce/settings";
import { clearStoreStorage } from "~/utils/storage";
import { createMockState } from "~/data/mock";
import {
  changeStock,
  installmentStatus,
  identifier,
  today,
  whatsappLink,
  money,
  formatDate,
} from "~/utils/domain";
import { recordAudit } from "~/utils/commerce/state";
import {
  transaction,
  createCommerceOrder,
  completeDirectSale,
  transitionOrder,
  recordOrderPayment,
  recordInstallmentPayment,
  advanceOrderStage,
} from "~/utils/commerce/orders";
import {
  normalizePhone,
  validateCustomer,
  validateProduct,
  validDate,
} from "~/utils/commerce/catalog";
import {
  quoteOrder,
  effectiveUnitPrice,
  validateCoupon,
  validatePromotion,
  validateRate,
  cents,
} from "~/utils/commerce/pricing";
import type {
  Product,
  Customer,
  CartLine,
  PaymentMethod,
  OrderStatus,
  BusinessState,
  QuoteInput,
  OperationContext,
  ClientAddress,
  Coupon,
  Promotion,
  InterestRate,
  Brand,
  Category,
  FinancialMovement,
} from "~/types";
export function useBusiness() {
  const { demo } = useStoreMode();
  const state = useState<BusinessState>("business", () =>
    demo ? createMockState() : emptyBusiness(),
  );
  const notification = useState("notification", () => "");
  const managerId = useState<string | null>("manager-session", () => null);
  const notify = (message: string) => {
    notification.value = message;
    setTimeout(() => {
      if (notification.value === message) notification.value = "";
    }, 4000);
  };
  const context = (
    origin: OperationContext["origin"] = "manager",
  ): OperationContext => ({
    now: new Date().toISOString(),
    actorId: origin === "manager" ? managerId.value : null,
    origin: origin === "manager" && !managerId.value ? "system" : origin,
  });
  const brands = computed(() => state.value.brands || []),
    categories = computed(() => state.value.categories || []);
  const customerName = (id: string) =>
    state.value.customers.find((c) => c.id === id)?.name || "Cliente";
  const productName = (id: string) =>
    state.value.products.find((p) => p.id === id)?.name || "Produto";
  const brandName = (id: string) =>
    brands.value.find((b) => b.id === id)?.name || "";
  const categoryName = (id: string) =>
    categories.value.find((c) => c.id === id)?.name || "";
  const saveProduct = (input: Product) => {
    const result = transaction(state.value, (draft) => {
      const product = validateProduct(draft, input);
      if (
        !draft.brands!.some((b) => b.id === product.brandId) ||
        !draft.categories!.some((c) => c.id === product.categoryId)
      )
        throw Error("Selecione marca e categoria cadastradas.");
      const index = draft.products.findIndex((p) => p.id === product.id),
        previous = index < 0 ? 0 : draft.products[index]!.stock;
      const saved = {
        ...product,
        id: index < 0 ? identifier() : product.id,
        stock: previous,
      };
      if (index < 0) draft.products.unshift(saved);
      else draft.products[index] = saved;
      changeStock(
        draft,
        saved.id,
        "Ajuste",
        product.stock,
        index < 0 ? "Saldo inicial" : "Ajuste pelo cadastro",
      );
      recordAudit(
        draft,
        context(),
        index < 0 ? "Criar produto" : "Editar produto",
        "Produto",
        saved.id,
      );
      return saved;
    });
    notify(input.id ? "Produto atualizado." : "Produto cadastrado.");
    return result;
  };
  const saveCustomer = (
    input: Customer,
    origin: OperationContext["origin"] = "manager",
  ) => {
    const result = transaction(state.value, (draft) => {
      const customer = validateCustomer(draft.customers, input);
      if (customer.birthday && customer.birthday > today())
        throw Error("Confira a data de nascimento.");
      const index = draft.customers.findIndex((c) => c.id === customer.id);
      const saved = {
        ...customer,
        id: index < 0 ? identifier() : customer.id,
        createdAt: index < 0 ? today() : customer.createdAt,
      };
      if (index < 0) draft.customers.unshift(saved);
      else draft.customers[index] = saved;
      draft.migrationIssues = draft.migrationIssues!.filter(
        (i) => !(i.kind === "phone" && i.entityId === saved.id),
      );
      recordAudit(
        draft,
        context(origin),
        index < 0 ? "Criar cliente" : "Editar cliente",
        "Cliente",
        saved.id,
      );
      return saved;
    });
    notify(input.id ? "Cliente atualizado." : "Cliente cadastrado.");
    return result;
  };
  const finishSale = (
    customerId: string,
    lines: CartLine[],
    paymentMethod: PaymentMethod,
    count: number,
    due: string,
    couponCode = "",
  ) => {
    const order = completeDirectSale(
      state.value,
      customerId,
      {
        lines,
        paymentMethod,
        installmentCount: count,
        firstDueDate: due,
        couponCode,
      },
      context(),
    );
    notify("Venda concluída e estoque atualizado.");
    return state.value.sales.find((s) => s.orderId === order.id)!;
  };
  const moveStock = (
    productId: string,
    type: "Entrada" | "Saída" | "Ajuste",
    quantity: number,
    reason: string,
  ) => {
    transaction(state.value, (draft) => {
      changeStock(draft, productId, type, quantity, reason);
      recordAudit(draft, context(), "Movimentar estoque", "Produto", productId);
    });
    notify("Estoque atualizado.");
  };
  const payInstallment = (id: string) => {
    recordInstallmentPayment(state.value, id, context());
    notify("Parcela marcada como paga.");
  };
  const changeOrderStatus = (
    id: string,
    status: OrderStatus,
    origin: OperationContext["origin"] = "manager",
  ) => {
    const o = transitionOrder(state.value, id, status, context(origin));
    notify("Pedido atualizado.");
    return o;
  };
  const simulatePayment = (
    id: string,
    result: "Aprovado" | "Pendente" | "Recusado",
  ) => recordOrderPayment(state.value, id, result, context("customer"));
  const createOrder = (
    name: string,
    phone: string,
    lines: CartLine[],
    options: Partial<QuoteInput> & {
      birthday?: string;
      delivery?: "Entrega" | "Retirada";
      address?: ClientAddress | null;
    } = {},
  ) => {
    if (!options.paymentMethod) throw Error("Escolha a forma de pagamento.");
    const normalized = normalizePhone(phone);
    const result = transaction(state.value, (draft) => {
      if (!name.trim()) throw Error("Informe seu nome.");
      const matches = draft.customers.filter((c) => {
        try {
          return normalizePhone(c.phone) === normalized;
        } catch {
          return false;
        }
      });
      if (matches.length > 1)
        throw Error(
          "Há cadastros com o mesmo telefone. Revise os clientes antes de continuar.",
        );
      let customer = matches[0];
      if (!customer) {
        customer = {
          id: identifier(),
          name: name.trim(),
          phone: normalized,
          birthday: options.birthday || "",
          createdAt: today(),
        };
        validateCustomer(draft.customers, { ...customer, id: "" });
        draft.customers.push(customer);
      }
      return createCommerceOrder(
        draft,
        customer.id,
        { ...options, lines, paymentMethod: options.paymentMethod! },
        context("customer"),
        options,
      );
    });
    notify("Pedido enviado com sucesso.");
    return result;
  };
  const billingMessage = (id: string) => {
    const p = state.value.installments.find((p) => p.id === id),
      c = state.value.customers.find((c) => c.id === p?.customerId);
    if (!p || !c) throw Error("Parcela ou cliente não encontrado.");
    return {
      phone: c.phone,
      message: `Olá, ${c.name}! Tudo bem? Passando para lembrar da parcela de ${money(p.amount)} referente à sua compra, com vencimento em ${formatDate(p.dueDate)}.`,
    };
  };
  const billingLink = (id: string) => {
    const b = billingMessage(id);
    return whatsappLink(b.phone, b.message);
  };
  const confirmBilling = (id: string) =>
    transaction(state.value, (draft) => {
      const p = draft.installments.find((p) => p.id === id);
      if (!p || p.paidAt || p.cancelledAt)
        throw Error("Esta parcela não possui cobrança aberta.");
      const record = {
        id: identifier(),
        installmentId: id,
        message: billingMessage(id).message,
        sentAt: new Date().toISOString(),
      };
      draft.billingRecords!.unshift(record);
      recordAudit(
        draft,
        context(),
        "Declarar envio de cobrança",
        "Cobrança",
        record.id,
      );
      notify("Envio declarado registrado.");
    });
  const saveCoupon = (input: Coupon) =>
    transaction(state.value, (draft) => {
      const data = validateCoupon(input, draft.coupons!);
      upsert(draft.coupons!, data);
      recordAudit(draft, context(), "Salvar cupom", "Cupom", data.id);
    });
  const savePromotion = (input: Promotion, productIds: string[]) =>
    transaction(state.value, (draft) => {
      const data = validatePromotion(input);
      if (
        !productIds.length ||
        productIds.some((id) => !draft.products.some((p) => p.id === id))
      )
        throw Error("Selecione produtos cadastrados.");
      upsert(draft.promotions!, data);
      draft.productPromotions = draft
        .productPromotions!.filter((p) => p.promotionId !== data.id)
        .concat(
          [...new Set(productIds)].map((productId) => ({
            productId,
            promotionId: data.id,
          })),
        );
      recordAudit(draft, context(), "Salvar promoção", "Promoção", data.id);
    });
  const saveRate = (input: InterestRate) =>
    transaction(state.value, (draft) => {
      validateRate(input, draft.interestRates!);
      upsert(draft.interestRates!, input);
      recordAudit(draft, context(), "Salvar taxa", "Taxa", input.id);
    });
  const saveClassification = (
    kind: "brands" | "categories",
    input: Brand | Category,
  ) =>
    transaction(state.value, (draft) => {
      const name = input.name.trim(),
        list = draft[kind]!;
      if (
        !name ||
        list.some(
          (i) =>
            i.id !== input.id && i.name.toLowerCase() === name.toLowerCase(),
        )
      )
        throw Error("Nome vazio ou já cadastrado.");
      upsert(list, { ...input, name });
      recordAudit(draft, context(), "Salvar classificação", kind, input.id);
    });
  const addFinance = (
    input: Pick<
      FinancialMovement,
      "type" | "description" | "amount" | "date" | "orderId"
    >,
  ) =>
    transaction(state.value, (draft) => {
      cents(input.amount);
      if (
        input.amount <= 0 ||
        !input.description.trim() ||
        !validDate(input.date) ||
        !["Entrada", "Saída"].includes(input.type) ||
        (input.orderId && !draft.orders.some((o) => o.id === input.orderId))
      )
        throw Error("Confira descrição, valor, data e pedido.");
      const entry = {
        ...input,
        id: identifier(),
        description: input.description.trim(),
        installmentId: null,
        source: "manual" as const,
        operationKey: null,
      };
      draft.financialMovements!.unshift(entry);
      recordAudit(
        draft,
        context(),
        "Registrar finanças",
        "Movimentação financeira",
        entry.id,
      );
      notify("Lançamento registrado.");
    });
  const grantBenefit = (
    customerId: string,
    couponId: string | null,
    year: number,
  ) =>
    transaction(state.value, (draft) => {
      if (
        !draft.customers.some((c) => c.id === customerId) ||
        (couponId && !draft.coupons!.some((c) => c.id === couponId)) ||
        !Number.isInteger(year) ||
        year < 1900 ||
        year > 9999
      )
        throw Error("Confira cliente, cupom e ano.");
      const item = {
        id: identifier(),
        customerId,
        couponId,
        year,
        grantedAt: new Date().toISOString(),
      };
      draft.birthdayBenefits!.unshift(item);
      recordAudit(draft, context(), "Conceder benefício", "Benefício", item.id);
      notify("Benefício registrado.");
    });
  const registerGift = (
    customerId: string,
    description: string,
    date: string,
  ) =>
    transaction(state.value, (draft) => {
      if (
        !draft.customers.some((c) => c.id === customerId) ||
        !description.trim() ||
        !validDate(date)
      )
        throw Error("Confira cliente, descrição e data.");
      const item = {
        id: identifier(),
        customerId,
        description: description.trim(),
        date,
      };
      draft.gifts!.unshift(item);
      recordAudit(draft, context(), "Registrar brinde", "Brinde", item.id);
      notify("Brinde registrado.");
    });
  const birthdayLink = (id: string) => {
    const c = state.value.customers.find((c) => c.id === id)!;
    return whatsappLink(
      c.phone,
      `Olá, ${c.name}! Feliz aniversário! Desejamos um dia especial, cheio de alegria.`,
    );
  };
  const monthSales = computed(() =>
    state.value.sales.filter((s) => s.date.slice(0, 7) === today().slice(0, 7)),
  );
  const revenue = computed(
    () => monthSales.value.reduce((sum, s) => sum + cents(s.total), 0) / 100,
  );
  const profit = computed(
    () =>
      state.value.orders
        .filter(
          (o) =>
            o.accountedAt &&
            o.status !== "Cancelado" &&
            o.date.slice(0, 7) === today().slice(0, 7),
        )
        .reduce(
          (sum, o) =>
            sum +
            o.items.reduce(
              (t, i) =>
                t +
                (i.costPrice === null
                  ? 0
                  : (cents(i.unitPrice) - cents(i.costPrice || 0)) *
                    i.quantity),
              0,
            ) -
            cents(o.discount || 0),
          0,
        ) / 100,
  );
  const openInstallments = computed(() =>
    state.value.installments.filter((p) => !p.paidAt && !p.cancelledAt),
  );
  const overdue = computed(() =>
    openInstallments.value.filter((p) => installmentStatus(p) === "Vencida"),
  );
  const receivable = computed(
    () =>
      openInstallments.value.reduce((sum, p) => sum + cents(p.amount), 0) / 100,
  );
  const lowStock = computed(() =>
    state.value.products.filter((p) => p.stock <= p.minimumStock),
  );
  const resetDemo = () => {
    state.value = createMockState();
    const account = useState<any>("client-account");
    if (account.value)
      Object.assign(account.value, {
        customerId: state.value.customers[0]!.id,
        name: state.value.customers[0]!.name,
        phone: state.value.customers[0]!.phone,
        email: "cliente@example.com",
        addresses: [],
        primaryId: "",
      });
    const flow = useState<any>("client-flow");
    if (flow.value)
      Object.assign(flow.value, { signedIn: false, records: {}, tickets: [] });
    useState<CartLine[]>("store-cart", () => []).value = [];
    managerId.value = null;
    try {
      for (const key of [
        "loja-flow-v1",
        "loja-client-v1",
        "loja-cart-v1",
        "loja-manager-v1",
      ])
        clearStoreStorage(localStorage, key);
    } catch {
      notify("Armazenamento indisponível.");
    }
    notify("Dados iniciais restaurados.");
    return navigateTo("/gestora/entrar");
  };
  const business = {
    state,
    brands,
    categories,
    notification,
    notify,
    customerName,
    productName,
    brandName,
    categoryName,
    saveProduct,
    removeProduct: (productId: string) => {
      transaction(state.value, (draft) => {
        archiveDemoProduct(draft, productId, new Date().toISOString());
        recordAudit(
          draft,
          context(),
          "Excluir produto do catálogo",
          "Produto",
          productId,
        );
      });
      notify("Produto excluído do catálogo. Histórico preservado.");
    },
    saveCustomer,
    finishSale,
    moveStock,
    payInstallment,
    changeOrderStatus,
    createOrder,
    simulatePayment,
    advanceOrder: (id: string) =>
      advanceOrderStage(state.value, id, context("customer")),
    billingLink,
    confirmBilling,
    saveCoupon,
    savePromotion,
    saveRate,
    saveClassification,
    addFinance,
    grantBenefit,
    registerGift,
    birthdayLink,
    resetDemo,
    settings: computed(() => state.value.settings || defaultSettings()),
    saveSettings: (input: StoreSettings) => {
      state.value.settings = validateSettings(input);
    },
    receiveOrder: (id: string) =>
      recordOrderPayment(state.value, id, "Aprovado", context()),
    monthSales,
    revenue,
    profit,
    openInstallments,
    overdue,
    receivable,
    lowStock,
    quote: (input: QuoteInput) => quoteOrder(state.value, input),
    productPrice: (id: string) => effectiveUnitPrice(state.value, id),
  };
  return demo ? business : { ...business, ...useApiOperations() };
}
function upsert<T extends { id: string }>(items: T[], input: T) {
  const index = items.findIndex((i) => i.id === input.id);
  if (index < 0) items.unshift({ ...input });
  else items[index] = { ...input };
}

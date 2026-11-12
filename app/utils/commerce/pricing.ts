import type {
  BusinessState,
  Coupon,
  Promotion,
  QuoteInput,
  Quote,
  InterestRate,
} from "../../types/index.ts";
import { createSaleItems, splitInstallments, today } from "../domain.ts";
import { validDate } from "./catalog.ts";
export function cents(n: number) {
  const c = Math.round(n * 100);
  if (!Number.isFinite(n) || n < 0 || !Number.isSafeInteger(c))
    throw Error("Informe um valor monetário válido.");
  return c;
}
export function validatePeriod(start: string, end: string) {
  if (!validDate(start) || !validDate(end) || end < start)
    throw Error("Confira o início e fim da validade.");
}
export function validateCoupon(input: Coupon, existing: Coupon[]) {
  validatePeriod(input.startsAt, input.endsAt);
  const code = input.code.trim().toUpperCase();
  if (
    !code ||
    code.length > 30 ||
    existing.some((c) => c.id !== input.id && c.code.toUpperCase() === code)
  )
    throw Error("Código de cupom vazio ou já cadastrado.");
  if (
    !["fixed", "percent"].includes(input.discountType) ||
    !Number.isFinite(input.value) ||
    input.value <= 0 ||
    (input.discountType === "percent" && input.value > 100)
  )
    throw Error("Confira o valor do desconto.");
  if (
    input.usageLimit !== null &&
    (!Number.isInteger(input.usageLimit) || input.usageLimit < 1)
  )
    throw Error("Limite de uso deve ser inteiro positivo.");
  cents(input.value);
  return { ...input, code };
}
export function validatePromotion(input: Promotion) {
  validatePeriod(input.startsAt, input.endsAt);
  if (
    !input.name.trim() ||
    !Number.isFinite(input.discount) ||
    input.discount <= 0 ||
    input.discount > 100
  )
    throw Error("Confira nome e percentual da promoção.");
  return { ...input, name: input.name.trim() };
}
export function validateRate(input: InterestRate, rates: InterestRate[]) {
  if (
    !Number.isInteger(input.count) ||
    input.count < 1 ||
    input.count > 12 ||
    !Number.isFinite(input.percent) ||
    input.percent < 0 ||
    input.percent > 100 ||
    rates.some((r) => r.id !== input.id && r.count === input.count)
  )
    throw Error(
      "Confira parcelas (1 a 12) e taxa (0 a 100%). Uma taxa por quantidade.",
    );
  return input;
}
export function effectiveUnitPrice(
  state: BusinessState,
  productId: string,
  date = today(),
) {
  const product = state.products.find((p) => p.id === productId);
  if (!product) throw Error("Produto não encontrado.");
  const linked = new Set(
    (state.productPromotions || [])
      .filter((p) => p.productId === productId)
      .map((p) => p.promotionId),
  );
  const discount = Math.max(
    0,
    ...(state.promotions || [])
      .filter((p) => linked.has(p.id) && p.startsAt <= date && p.endsAt >= date)
      .map((p) => p.discount),
  );
  return Math.round((cents(product.salePrice) * (100 - discount)) / 100) / 100;
}
export function quoteOrder(state: BusinessState, input: QuoteInput): Quote {
  const date = input.date || today();
  if (!validDate(date)) throw Error("Informe uma data válida.");
  if (
    !["Dinheiro", "PIX", "Cartão", "Boleto", "Parcelado"].includes(
      input.paymentMethod,
    )
  )
    throw Error("Escolha a forma de pagamento.");
  const count = ["Parcelado", "Cartão"].includes(input.paymentMethod)
    ? (input.installmentCount ?? 3)
    : 1;
  if (!Number.isInteger(count) || count < 1 || count > 12)
    throw Error("Informe de 1 a 12 parcelas.");
  const items = createSaleItems(state.products, input.lines).map((item) => {
    const p = state.products.find((p) => p.id === item.productId)!;
    return {
      ...item,
      name: p.name,
      brandId: p.brandId,
      categoryId: p.categoryId,
      unitPrice: effectiveUnitPrice(state, p.id, date),
    };
  });
  const subtotalCents = items.reduce(
    (sum, i) => sum + cents(i.unitPrice) * i.quantity,
    0,
  );
  if (!Number.isSafeInteger(subtotalCents))
    throw Error("Total excede o intervalo de cálculo.");
  let discountCents = 0,
    couponId: string | null = null;
  if (input.couponCode?.trim()) {
    const coupon = (state.coupons || []).find(
      (c) => c.code.toUpperCase() === input.couponCode!.trim().toUpperCase(),
    );
    if (!coupon || coupon.startsAt > date || coupon.endsAt < date)
      throw Error("Cupom não encontrado ou fora da validade.");
    const used = state.orders.filter(
      (o) => o.couponId === coupon.id && o.status !== "Cancelado",
    ).length;
    if (coupon.usageLimit !== null && used >= coupon.usageLimit)
      throw Error("Limite de uso deste cupom atingido.");
    discountCents = Math.min(
      subtotalCents,
      coupon.discountType === "fixed"
        ? cents(coupon.value)
        : Math.round((subtotalCents * coupon.value) / 100),
    );
    couponId = coupon.id;
  }
  const shipping = cents(input.shipping || 0);
  if (input.shipping !== undefined) cents(input.shipping);
  const rate = ["Parcelado", "Cartão"].includes(input.paymentMethod)
    ? state.interestRates?.find((r) => r.count === count)
    : undefined;
  if (input.paymentMethod === "Cartão" && !rate)
    throw Error("Taxa de juros não configurada para essas parcelas.");
  const base = subtotalCents - discountCents + shipping;
  const interest = Math.round((base * (rate?.percent || 0)) / 100);
  const total = (base + interest) / 100;
  const due = input.firstDueDate || date;
  if (
    ["Parcelado", "Cartão"].includes(input.paymentMethod) &&
    (!validDate(due) || due < date)
  )
    throw Error("O primeiro vencimento deve ser hoje ou uma data futura.");
  return {
    items,
    subtotal: subtotalCents / 100,
    discount: discountCents / 100,
    shipping: shipping / 100,
    interest: interest / 100,
    total,
    couponId,
    interestRateId: rate?.id || null,
    interestPercent: rate?.percent || 0,
    schedule:
      ["Parcelado", "Cartão"].includes(input.paymentMethod) && total > 0
        ? splitInstallments(total, count, due)
        : [],
  };
}

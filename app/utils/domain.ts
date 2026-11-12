import { completeDirectSale } from "./commerce/orders.ts";
import type {
  CartLine,
  Product,
  SaleItem,
  Installment,
  BusinessState,
  PaymentMethod,
} from "../types/index.ts";
export const money = (amount: number) =>
  amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const formatDate = (date: string) =>
  new Date(date + "T12:00:00").toLocaleDateString("pt-BR");
export const today = () =>
  new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
export const identifier = () => crypto.randomUUID();
export const stockStatus = (product: Product) =>
  product.stock === 0
    ? "Sem estoque"
    : product.stock <= product.minimumStock
      ? "Estoque baixo"
      : "Em estoque";
export const installmentStatus = (
  installment: Installment,
  reference = today(),
) =>
  installment.paidAt
    ? "Paga"
    : installment.cancelledAt
      ? "Cancelada"
      : installment.dueDate < reference
        ? "Vencida"
        : "Em aberto";
export function addMonths(date: string, offset: number) {
  const [year, month, day] = date.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const lastDay = new Date(year, month + offset, 0).getDate();
  const nextDate = new Date(
    year,
    month - 1 + offset,
    Math.min(day, lastDay),
    12,
  );
  return (
    nextDate.getFullYear() +
    "-" +
    String(nextDate.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(nextDate.getDate()).padStart(2, "0")
  );
}
export function splitInstallments(
  total: number,
  count: number,
  firstDueDate: string,
) {
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > 12 ||
    !Number.isFinite(total) ||
    total <= 0 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(firstDueDate)
  )
    throw new Error(
      "Confira o valor, a quantidade de parcelas e o vencimento.",
    );
  if (
    new Date(firstDueDate + "T12:00:00").toLocaleDateString("sv-SE") !==
    firstDueDate
  )
    throw new Error("Informe uma data de vencimento válida.");
  const cents = Math.round(total * 100);
  if (count > cents)
    throw Error(
      "Cada parcela deve ter pelo menos um centavo. Reduza o número de parcelas.",
    );
  return Array.from({ length: count }, (_, index) => ({
    amount: (Math.floor(cents / count) + (index < cents % count ? 1 : 0)) / 100,
    dueDate: addMonths(firstDueDate, index),
  }));
}
export function createSaleItems(
  products: Product[],
  lines: CartLine[],
): SaleItem[] {
  if (!lines.length) throw new Error("Adicione pelo menos um produto.");
  if (
    lines.some((line) => !Number.isInteger(line.quantity) || line.quantity <= 0)
  )
    throw new Error("Informe quantidades inteiras e positivas.");
  const consolidated = new Map<string, number>();
  lines.forEach((line) =>
    consolidated.set(
      line.productId,
      (consolidated.get(line.productId) || 0) + line.quantity,
    ),
  );
  return Array.from(consolidated, ([productId, quantity]) => {
    const product = products.find((product) => product.id === productId);
    if (
      !product ||
      product.status !== "active" ||
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      quantity > product.stock
    )
      throw new Error("Quantidade indisponível em estoque.");
    return {
      productId,
      quantity,
      unitPrice: product.salePrice,
      costPrice: product.costPrice,
    };
  });
}
export function completeSale(
  state: BusinessState,
  customerId: string,
  lines: CartLine[],
  paymentMethod: PaymentMethod,
  count = 1,
  firstDueDate = today(),
) {
  const order = completeDirectSale(state, customerId, {
    lines,
    paymentMethod,
    installmentCount: count,
    firstDueDate,
  });
  return state.sales.find((sale) => sale.orderId === order.id)!;
}

export function changeStock(
  state: BusinessState,
  productId: string,
  type: "Entrada" | "Saída" | "Ajuste",
  quantity: number,
  reason: string,
) {
  const product = state.products.find((product) => product.id === productId);
  if (
    !product ||
    !Number.isInteger(quantity) ||
    quantity < 0 ||
    (type !== "Ajuste" && quantity === 0)
  )
    throw new Error("Informe uma quantidade válida.");
  const newStock =
    type === "Ajuste"
      ? quantity
      : product.stock + (type === "Entrada" ? quantity : -quantity);
  if (newStock < 0) throw new Error("A saída excede o estoque disponível.");
  const delta = newStock - product.stock;
  if (!delta) return;
  product.stock = newStock;
  state.movements.unshift({
    id: identifier(),
    productId,
    type: delta > 0 ? "Entrada" : "Saída",
    quantity: Math.abs(delta),
    reason,
    date: today(),
  });
}
export function whatsappLink(phone: string, message: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = "55" + digits;
  if (!/^55\d{10,11}$/.test(digits))
    throw new Error("Informe um telefone com DDD.");
  return "https://wa.me/" + digits + "?text=" + encodeURIComponent(message);
}

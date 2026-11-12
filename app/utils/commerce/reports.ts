import type { Order, OrderItem } from "../../types/index.ts";
import { cents } from "./pricing.ts";
export function allocateDiscount(
  items: Pick<OrderItem, "unitPrice" | "quantity">[],
  discount: number,
): number[] {
  const weights = items.map((i) => cents(i.unitPrice) * i.quantity),
    total = weights.reduce((a, b) => a + b, 0);
  if (!total) return weights.map(() => 0);
  const amount = cents(discount),
    exact = weights.map((w) => (amount * w) / total),
    shares = exact.map(Math.floor);
  let remaining = amount - shares.reduce((a, b) => a + b, 0);
  const ranked = exact
    .map((v, i) => ({ i, f: v - shares[i]! }))
    .sort((a, b) => b.f - a.f || a.i - b.i);
  for (const { i } of ranked) {
    if (!remaining) break;
    shares[i]!++;
    remaining--;
  }
  return shares;
}
export function groupedMerchandise(
  orders: Order[],
  field: "brandId" | "categoryId",
  id: string,
) {
  return (
    orders
      .filter((o) => o.accountedAt && o.status !== "Cancelado")
      .reduce((sum, o) => {
        const discounts = allocateDiscount(o.items, o.discount ?? 0);
        return (
          sum +
          o.items.reduce(
            (t, i, k) =>
              t +
              (i[field] === id
                ? cents(i.unitPrice) * i.quantity - discounts[k]!
                : 0),
            0,
          )
        );
      }, 0) / 100
  );
}
export function estimatedProfit(orders: Order[]) {
  return (
    orders
      .filter((o) => o.accountedAt && o.status !== "Cancelado")
      .reduce(
        (sum, o) =>
          sum +
          o.items.reduce(
            (t, i) =>
              t +
              (i.costPrice == null
                ? 0
                : (cents(i.unitPrice) - cents(i.costPrice)) * i.quantity),
            0,
          ) -
          cents(o.discount ?? 0),
        0,
      ) / 100
  );
}
export function csvCell(value: unknown): string {
  let text = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}

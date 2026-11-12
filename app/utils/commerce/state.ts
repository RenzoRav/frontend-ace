import { defaultSettings } from "./settings.ts";
import type {
  BusinessState,
  OperationContext,
  Order,
  Sale,
} from "../../types/index.ts";
export function initializeCollections(state: BusinessState) {
  state.schemaVersion = 2;
  state.brands ??= [];
  state.categories ??= [];
  state.coupons ??= [];
  state.settings ??= defaultSettings();
  state.promotions ??= [];
  state.productPromotions ??= [];
  state.interestRates ??= [];
  state.financialMovements ??= [];
  state.billingRecords ??= [];
  state.birthdayBenefits ??= [];
  state.gifts ??= [];
  state.managers ??= [
    { id: "manager-demo", name: "Marina Costa", email: "gestora@exemplo.test" },
  ];
  state.auditLogs ??= [];
  state.statusHistory ??= [];
  state.migrationIssues ??= [];
  return state;
}
export function recordAudit(
  state: BusinessState,
  context: OperationContext,
  action: string,
  entity: string,
  entityId: string,
) {
  if (context.origin !== "manager") return;
  if (
    !context.actorId ||
    !state.managers?.some((m) => m.id === context.actorId)
  )
    throw Error("Entre como gestora para registrar esta ação.");
  state.auditLogs!.unshift({
    id: crypto.randomUUID(),
    actorId: context.actorId,
    action,
    entity,
    entityId,
    date: context.now,
  });
}
export function salesFromOrders(state: BusinessState): Sale[] {
  return state.orders
    .filter((o) => o.accountedAt && o.status !== "Cancelado")
    .map((o) => ({
      id: o.legacySaleId || o.id,
      orderId: o.id,
      number: o.legacySaleId
        ? o.number.replace(/^P-/, "V-")
        : o.number.replace(/^P-/, "V-"),
      customerId: o.customerId,
      date: o.date,
      paymentMethod: o.paymentMethod || "PIX",
      total: o.total,
      items: o.items.map((i) => ({ ...i, costPrice: i.costPrice ?? 0 })),
    }));
}
// Compatibility cache for existing readers; rebuilt from orders, never trusted on load.
export function refreshSales(state: BusinessState) {
  state.sales = salesFromOrders(state);
}
export function history(
  state: BusinessState,
  order: Order,
  previousStatus: string,
  context: OperationContext,
) {
  state.statusHistory!.unshift({
    id: crypto.randomUUID(),
    orderId: order.id,
    previousStatus,
    newStatus: order.status,
    date: context.now,
    origin: context.origin,
    actorId: context.origin === "manager" ? context.actorId : null,
  });
}

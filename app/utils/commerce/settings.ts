import type { BusinessState, Installment, Order } from "../../types/index.ts";
import { normalizePhone, validDate } from "./catalog.ts";
import { money, whatsappLink } from "../domain.ts";
export interface StoreSettings {
  managerPhone: string;
  alertDays: number;
  deliveryFee: number;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
}
export const defaultSettings = (): StoreSettings => ({
  managerPhone: "",
  alertDays: 7,
  deliveryFee: 12,
  deliveryEnabled: true,
  pickupEnabled: true,
});
export function validateSettings(input: StoreSettings): StoreSettings {
  if (
    !Number.isInteger(input.alertDays) ||
    input.alertDays < 0 ||
    input.alertDays > 90
  )
    throw Error("Antecedência deve ser de 0 a 90 dias.");
  if (
    !Number.isFinite(input.deliveryFee) ||
    input.deliveryFee < 0 ||
    input.deliveryFee > 99999999.99
  )
    throw Error("Confira o valor do frete.");
  if (!input.deliveryEnabled && !input.pickupEnabled)
    throw Error("Ative entrega ou retirada.");
  return {
    ...input,
    managerPhone: input.managerPhone.trim()
      ? normalizePhone(input.managerPhone)
      : "",
    deliveryFee: Math.round(input.deliveryFee * 100) / 100,
  };
}
export function upcomingInstallments(
  installments: Installment[],
  date: string,
  days: number,
) {
  const end = new Date(date + "T12:00:00");
  end.setDate(end.getDate() + days);
  return installments.filter(
    (installment) =>
      !installment.paidAt &&
      !installment.cancelledAt &&
      installment.dueDate >= date &&
      installment.dueDate <= end.toLocaleDateString("sv-SE"),
  );
}
export function monthlyReceivable(installments: Installment[], month: string) {
  return (
    installments
      .filter(
        (installment) =>
          !installment.paidAt &&
          !installment.cancelledAt &&
          installment.dueDate.startsWith(month),
      )
      .reduce(
        (amount, installment) => amount + Math.round(installment.amount * 100),
        0,
      ) / 100
  );
}
export function birthdayCustomers(state: BusinessState, month: string) {
  return state.customers.filter(
    (customer) =>
      validDate(customer.birthday) &&
      customer.birthday.slice(5, 7) === month.slice(5, 7),
  );
}
export function orderWhatsApp(order: Order, phone: string) {
  if (!phone.trim()) return "";
  return whatsappLink(
    normalizePhone(phone),
    `Olá! Pedido ${order.number}\n${order.items.map((item) => `${item.quantity} × ${item.name || "Produto"}: ${money(item.unitPrice * item.quantity)}`).join("\n")}\nPagamento: ${order.paymentMethod}\nTotal: ${money(order.total)}\nAguardo confirmação da loja.`,
  );
}

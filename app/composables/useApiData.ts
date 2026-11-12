import type { BusinessState, Brand, Customer } from "~/types";
import {
  emptyBusiness,
  productFromApi,
  orderFromApi,
  customerFromApi,
} from "~/utils/api/adapters";
import type { PageView, ProductDto, OrderDto } from "~/utils/api/adapters";
import type { StoreSettings } from "~/utils/commerce/settings";
import { refreshSales } from "~/utils/commerce/state";
export function useApiData() {
  const api = useNuxtApp().$api;
  const state = useState<BusinessState>("business", emptyBusiness);
  const generation = useState("api-data-generation", () => 0);
  const loading = useState("api-loading", () => false);
  const error = useState("api-error", () => "");
  async function pages<T>(path: string): Promise<T[]> {
    const values: T[] = [];
    for (let page = 0; page < 100; page++) {
      const result = await api.request<PageView<T>>(
        `${path}${path.includes("?") ? "&" : "?"}page=${page}&size=100`,
      );
      values.push(...result.content);
      if (page + 1 >= result.totalPages) return values;
    }
    throw Error(
      "Consulta muito extensa. O limite de 10.000 registros por coleção foi atingido; solicite uma consulta segmentada antes de continuar.",
    );
  }
  async function load(manager: boolean) {
    const current = ++generation.value;
    loading.value = true;
    error.value = "";
    try {
      const next = emptyBusiness();
      const prefix = manager ? "/manager" : "/catalog";
      const [products, brands, categories, settings, rates] = await Promise.all(
        [
          pages<ProductDto>(prefix + "/products"),
          api.request<Brand[]>(prefix + "/brands"),
          api.request<Brand[]>(prefix + "/categories"),
          api.request<StoreSettings>("/catalog/settings"),
          api.request<
            { id: string; installmentCount: number; percent: number }[]
          >("/catalog/interest-rates"),
        ],
      );
      next.products = products.map(productFromApi);
      next.brands = brands;
      next.categories = categories;
      next.settings = settings;
      next.interestRates = rates.map((rate) => ({
        id: rate.id,
        count: rate.installmentCount,
        percent: rate.percent,
      }));
      if (manager) {
        const [
          customers,
          orders,
          coupons,
          promotions,
          finance,
          stock,
          audit,
          benefits,
          gifts,
          billings,
        ] = await Promise.all([
          pages<Customer>("/manager/customers"),
          pages<OrderDto>("/manager/orders"),
          pages<any>("/manager/coupons"),
          pages<any>("/manager/promotions"),
          pages<any>("/manager/finance"),
          pages<any>("/manager/inventory-movements"),
          pages<any>("/manager/audit"),
          pages<any>("/manager/birthday-benefits"),
          pages<any>("/manager/gifts"),
          pages<any>("/manager/billings"),
        ]);
        next.customers = customers.map(customerFromApi);
        next.orders = orders
          .map(orderFromApi)
          .sort((first, second) => Number(second.id) - Number(first.id));
        next.installments = orders.flatMap((order) =>
          order.installments.map((installment) => ({
            id: installment.id,
            orderId: order.id,
            saleId: order.id,
            customerId: order.customerId!,
            number: installment.number,
            count: order.installmentCount,
            amount: installment.amount,
            dueDate: installment.dueDate,
            paidAt: installment.paidAt,
            cancelledAt:
              installment.status === "CANCELLED" ? "cancelled" : null,
          })),
        );
        next.statusHistory = orders.flatMap((order) =>
          (order.history || []).map((history, index) => ({
            id: order.id + "-" + index,
            orderId: order.id,
            actorId: null,
            previousStatus: history.previousStatus || "",
            newStatus: history.nextStatus,
            date: history.date,
            origin: "manager" as const,
          })),
        );
        next.coupons = coupons.map((coupon) => ({
          id: coupon.id,
          code: coupon.code,
          discountType: coupon.type === "PERCENT" ? "percent" : "fixed",
          value: coupon.value,
          startsAt: coupon.validFrom,
          endsAt: coupon.validUntil,
          usageLimit: coupon.usageLimit,
        }));
        next.promotions = promotions.map((promotion) => ({
          id: promotion.id,
          name: promotion.name,
          discount: promotion.percent,
          startsAt: promotion.validFrom,
          endsAt: promotion.validUntil,
        }));
        next.productPromotions = promotions.flatMap((promotion) =>
          promotion.productIds.map((productId: string) => ({
            productId,
            promotionId: promotion.id,
          })),
        );
        next.financialMovements = finance.map((entry) => ({
          ...entry,
          type: entry.type === "IN" ? "Entrada" : "Saída",
          source:
            entry.source === "PAYMENT"
              ? "payment"
              : entry.source === "REFUND"
                ? "refund"
                : "manual",
          operationKey: null,
        }));
        next.movements = stock.map((movement) => ({
          id: movement.id,
          orderId: movement.orderId,
          productId: movement.productId,
          type: movement.quantity < 0 ? "Saída" : "Entrada",
          quantity: Math.abs(movement.quantity),
          reason: movement.description,
          date: movement.date,
        }));
        next.auditLogs = audit.map((entry) => ({
          ...entry,
          actorId: entry.managerId,
        }));
        next.managers = [
          ...new Map(
            audit.map((entry) => [
              entry.managerId,
              { id: entry.managerId, name: entry.managerName, email: "" },
            ]),
          ).values(),
        ];
        next.birthdayBenefits = benefits;
        next.gifts = gifts;
        next.billingRecords = billings.map((billing) => ({
          ...billing,
          sentAt: billing.declaredSentAt,
        }));
        refreshSales(next);
      }
      if (current === generation.value) state.value = next;
    } catch (problem) {
      if (current !== generation.value) return;
      state.value = emptyBusiness();
      error.value = (problem as Error).message;
      throw problem;
    } finally {
      if (current === generation.value) loading.value = false;
    }
  }
  return { load, loading, error, pages };
}

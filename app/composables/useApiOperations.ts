import type {
  Product,
  Customer,
  CartLine,
  PaymentMethod,
  OrderStatus,
  Coupon,
  Promotion,
  InterestRate,
  Brand,
  Category,
  FinancialMovement,
} from "~/types";
import {
  productFromApi,
  customerFromApi,
  orderFromApi,
  paymentToApi,
  emptyBusiness,
} from "~/utils/api/adapters";
import type { OrderDto, ProductDto } from "~/utils/api/adapters";
import type { StoreSettings } from "~/utils/commerce/settings";
export function useApiOperations() {
  const api = useNuxtApp().$api;
  const data = useApiData();
  const pendingSale = useState<{ fingerprint: string; key: string } | null>(
    "pending-api-sale",
    () => null,
  );
  const state = useState("business", emptyBusiness);
  async function mutate<T>(
    path: string,
    body?: unknown,
    method = "POST",
    key?: string,
  ): Promise<T> {
    const result = await api.request<T>(path, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: key ? { "Idempotency-Key": key } : undefined,
    });
    try {
      await data.load(true);
    } catch {
      throw Error(
        "Operação registrada, mas a atualização da tela falhou. Use Tentar novamente para consultar antes de repetir a operação.",
      );
    }
    return result;
  }
  return {
    async removeProduct(productId: string) {
      await mutate("/manager/products/" + productId, undefined, "DELETE");
    },
    async saveProduct(input: Product) {
      return productFromApi(
        await mutate<ProductDto>(
          "/manager/products" + (input.id ? "/" + input.id : ""),
          {
            name: input.name,
            description: input.description,
            imageUrl: input.imageUrl,
            price: input.salePrice,
            cost: input.costPrice,
            stock: input.stock,
            minimumStock: input.minimumStock,
            brandId: input.brandId,
            categoryId: input.categoryId,
            active: input.status === "active",
          },
          input.id ? "PUT" : "POST",
        ),
      );
    },
    async saveCustomer(input: Customer) {
      return customerFromApi(
        await mutate<Customer>(
          "/manager/customers" + (input.id ? "/" + input.id : ""),
          {
            name: input.name,
            phone: input.phone,
            birthday: input.birthday || null,
          },
          input.id ? "PUT" : "POST",
        ),
      );
    },
    async moveStock(
      productId: string,
      type: "Entrada" | "Saída" | "Ajuste",
      quantity: number,
      reason: string,
    ) {
      const product = state.value.products.find(
        (product) => product.id === productId,
      );
      if (!product) throw Error("Produto não encontrado.");
      if (type === "Ajuste")
        await mutate("/manager/products/" + productId + "/stock", {
          stock: quantity,
          reason,
        });
      else
        await mutate("/manager/products/" + productId + "/stock-movement", {
          type: type === "Entrada" ? "IN" : "OUT",
          quantity,
          reason,
        });
    },
    async changeOrderStatus(id: string, status: OrderStatus) {
      const path =
        status === "Confirmado"
          ? "confirm"
          : status === "Cancelado"
            ? "cancel"
            : "status";
      return orderFromApi(
        await mutate<OrderDto>(
          `/manager/orders/${id}/${path}`,
          path === "status"
            ? { status: status === "Finalizado" ? "FINISHED" : "PREPARING" }
            : {},
          path === "status" ? "PATCH" : "POST",
        ),
      );
    },
    async payInstallment(id: string) {
      await mutate(`/manager/installments/${id}/receive`, {});
    },
    async receiveOrder(id: string) {
      return orderFromApi(
        await mutate<OrderDto>(`/manager/orders/${id}/receive`, {}),
      );
    },
    async finishSale(
      customerId: string,
      lines: CartLine[],
      paymentMethod: PaymentMethod,
      count: number,
      _due: string,
      couponCode = "",
    ) {
      const payload = JSON.stringify({
        customerId,
        paymentMethod: paymentToApi[paymentMethod],
        installmentCount: count,
        delivery: false,
        couponCode,
        items: lines,
      });
      if (pendingSale.value?.fingerprint !== payload)
        pendingSale.value = { fingerprint: payload, key: crypto.randomUUID() };
      const created = await api.request<OrderDto>("/manager/orders", {
        method: "POST",
        headers: { "Idempotency-Key": pendingSale.value!.key },
        body: payload,
      });
      await mutate(`/manager/orders/${created.id}/confirm`, {});
      pendingSale.value = null;
      return state.value.sales.find((sale) => sale.orderId === created.id)!;
    },
    async confirmBilling(id: string) {
      const preview = await api.request<{ message: string }>(
        `/manager/installments/${id}/whatsapp-preview`,
      );
      await mutate(`/manager/installments/${id}/declare-sent`, {
        message: preview.message,
      });
    },
    async saveCoupon(input: Coupon) {
      const exists = state.value.coupons?.some(
        (coupon) => coupon.id === input.id,
      );
      await mutate(
        "/manager/coupons" + (exists ? "/" + input.id : ""),
        {
          code: input.code,
          type: input.discountType === "percent" ? "PERCENT" : "FIXED",
          value: input.value,
          validFrom: input.startsAt,
          validUntil: input.endsAt,
          usageLimit: input.usageLimit,
        },
        exists ? "PUT" : "POST",
      );
    },
    async savePromotion(input: Promotion, productIds: string[]) {
      const exists = state.value.promotions?.some(
        (promotion) => promotion.id === input.id,
      );
      await mutate(
        "/manager/promotions" + (exists ? "/" + input.id : ""),
        {
          name: input.name,
          percent: input.discount,
          validFrom: input.startsAt,
          validUntil: input.endsAt,
          productIds,
        },
        exists ? "PUT" : "POST",
      );
    },
    async saveRate(input: InterestRate) {
      await mutate(
        "/manager/interest-rates",
        { installmentCount: input.count, percent: input.percent },
        "PUT",
      );
    },
    async saveClassification(
      kind: "brands" | "categories",
      input: Brand | Category,
    ) {
      const exists = state.value[kind]?.some((entry) => entry.id === input.id);
      await mutate(
        `/manager/${kind}` + (exists ? "/" + input.id : ""),
        { name: input.name },
        exists ? "PUT" : "POST",
      );
    },
    async addFinance(
      input: Pick<
        FinancialMovement,
        "type" | "description" | "amount" | "date" | "orderId"
      >,
    ) {
      await mutate("/manager/finance", {
        type: input.type === "Entrada" ? "IN" : "OUT",
        description: input.description,
        amount: input.amount,
        date: input.date,
        orderId: input.orderId || null,
      });
    },
    async grantBenefit(
      customerId: string,
      couponId: string | null,
      year: number,
    ) {
      await mutate("/manager/birthday-benefits", {
        customerId,
        couponId,
        year,
      });
    },
    async registerGift(customerId: string, description: string, date: string) {
      await mutate("/manager/gifts", { customerId, description, date });
    },
    async saveSettings(input: StoreSettings) {
      await mutate("/manager/settings", input, "PUT");
    },
  };
}

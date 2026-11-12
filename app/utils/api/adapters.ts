import type {
  BusinessState,
  Product,
  Customer,
  Order,
  PaymentMethod,
} from "../../types/index.ts";
export interface PageView<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
export const paymentToApi: Record<PaymentMethod, string> = {
  PIX: "PIX",
  Dinheiro: "CASH",
  Cartão: "CARD",
  Boleto: "BOLETO",
  Parcelado: "INSTALLMENTS",
};
export const paymentFromApi: Record<string, PaymentMethod> = {
  PIX: "PIX",
  CASH: "Dinheiro",
  CARD: "Cartão",
  BOLETO: "Boleto",
  INSTALLMENTS: "Parcelado",
};
export const statuses = {
  NEW: "Novo",
  CONFIRMED: "Confirmado",
  PREPARING: "Em preparação",
  FINISHED: "Finalizado",
  CANCELLED: "Cancelado",
} as const;
export interface ProductDto {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price: number;
  cost?: number;
  stock: number;
  minimumStock?: number;
  active?: boolean;
  brand: { id: string; name: string };
  category: { id: string; name: string };
}
export function productFromApi(product: ProductDto): Product {
  return {
    id: product.id,
    name: product.name,
    description: product.description || "",
    imageUrl: product.imageUrl || "",
    salePrice: product.price,
    costPrice: product.cost ?? 0,
    stock: product.stock,
    minimumStock: product.minimumStock ?? 0,
    brandId: product.brand.id,
    categoryId: product.category.id,
    sku: product.id,
    status: product.active === false ? "inactive" : "active",
  };
}
export function emptyBusiness(): BusinessState {
  return {
    schemaVersion: 2,
    products: [],
    customers: [],
    orders: [],
    sales: [],
    installments: [],
    movements: [],
    brands: [],
    categories: [],
    coupons: [],
    promotions: [],
    productPromotions: [],
    interestRates: [],
    financialMovements: [],
    billingRecords: [],
    birthdayBenefits: [],
    gifts: [],
    managers: [],
    auditLogs: [],
    statusHistory: [],
    migrationIssues: [],
  };
}
export interface OrderDto {
  id: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  status: keyof typeof statuses;
  paymentStatus: string;
  paymentMethod: string;
  stockEffect?: string;
  subtotal: number;
  discount: number;
  shipping: number;
  interest: number;
  total: number;
  installmentCount: number;
  delivery?: boolean;
  addressSnapshot?: string;
  createdAt?: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }[];
  installments: {
    id: string;
    number: number;
    amount: number;
    dueDate: string;
    status: string;
    paidAt: string | null;
  }[];
  history?: { previousStatus: string; nextStatus: string; date: string }[];
  accessToken?: string;
}
export function orderFromApi(order: OrderDto): Order {
  return {
    addressSnapshot: order.addressSnapshot,
    id: order.id,
    number: "P-" + order.id,
    customerId: order.customerId || "",
    status: statuses[order.status],
    paymentMethod: paymentFromApi[order.paymentMethod],
    paymentStatus:
      order.paymentStatus === "APPROVED"
        ? "Aprovado"
        : order.paymentStatus === "REFUNDED"
          ? "Estornado"
          : "Pendente",
    subtotal: order.subtotal,
    discount: order.discount,
    shipping: order.shipping,
    interest: order.interest,
    total: order.total,
    installmentCount: order.installmentCount,
    date: (order.createdAt || new Date().toISOString()).slice(0, 10),
    createdAt: order.createdAt,
    accountedAt: ["CONFIRMED", "PREPARING", "FINISHED"].includes(order.status)
      ? order.createdAt
      : null,
    stockEffect: order.stockEffect?.toLowerCase() as Order["stockEffect"],
    delivery: order.delivery ? "Entrega" : "Retirada",
    items: order.items.map((item) => ({
      productId: item.productId,
      name: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      costPrice: null,
    })),
  };
}
export function customerFromApi(
  customer: Omit<Customer, "createdAt">,
): Customer {
  return { ...customer, birthday: customer.birthday || "", createdAt: "" };
}

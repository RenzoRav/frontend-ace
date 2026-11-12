import type { StoreSettings } from "../utils/commerce/settings";
export interface Brand {
  id: string;
  name: string;
  color: string;
}
export interface Category {
  id: string;
  name: string;
}
export interface Product {
  deletedAt?: string;
  id: string;
  name: string;
  brandId: string;
  categoryId: string;
  sku: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minimumStock: number;
  status: "active" | "inactive";
  imageUrl?: string;
  description?: string;
}
export interface Customer {
  id: string;
  name: string;
  phone: string;
  birthday: string;
  createdAt: string;
}
export interface SaleItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
}
export type PaymentMethod =
  "Dinheiro" | "PIX" | "Cartão" | "Boleto" | "Parcelado";
export interface Sale {
  orderId?: string;
  id: string;
  number: string;
  customerId: string;
  date: string;
  paymentMethod: PaymentMethod;
  items: SaleItem[];
  total: number;
}
export interface Installment {
  orderId?: string;
  cancelledAt?: string | null;
  id: string;
  saleId: string;
  customerId: string;
  number: number;
  count: number;
  amount: number;
  dueDate: string;
  paidAt: string | null;
}
export type OrderStatus =
  "Novo" | "Confirmado" | "Em preparação" | "Finalizado" | "Cancelado";
export interface OrderItem {
  id?: string;
  orderId?: string;
  name?: string;
  costPrice?: number | null;
  brandId?: string;
  categoryId?: string;
  productId: string;
  quantity: number;
  unitPrice: number;
}
export interface Order {
  addressSnapshot?: string;
  paymentMethod?: PaymentMethod | null;
  paymentStatus?: "Pendente" | "Aprovado" | "Recusado" | "Estornado";
  subtotal?: number;
  discount?: number;
  interest?: number;
  shipping?: number;
  couponId?: string | null;
  interestRateId?: string | null;
  interestPercent?: number;
  installmentCount?: number;
  firstDueDate?: string;
  stockEffect?: "none" | "applied" | "reversed" | "legacy-unknown";
  accountedAt?: string | null;
  legacySaleId?: string | null;
  source?: "store" | "direct" | "legacy-sale" | "legacy-order";
  createdAt?: string;
  delivery?: "Entrega" | "Retirada";
  address?: ClientAddress | null;
  stage?: number;
  legacy?: boolean;
  id: string;
  number: string;
  customerId: string;
  date: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
}
export interface InventoryMovement {
  orderId?: string | null;
  legacyAdjustment?: boolean;
  id: string;
  productId: string;
  type: "Entrada" | "Saída" | "Ajuste";
  quantity: number;
  date: string;
  reason: string;
}
export interface BusinessState {
  settings?: StoreSettings;
  schemaVersion?: number;
  brands?: Brand[];
  categories?: Category[];
  coupons?: Coupon[];
  promotions?: Promotion[];
  productPromotions?: ProductPromotion[];
  interestRates?: InterestRate[];
  financialMovements?: FinancialMovement[];
  billingRecords?: BillingRecord[];
  birthdayBenefits?: BirthdayBenefit[];
  gifts?: Gift[];
  managers?: Manager[];
  auditLogs?: AuditLog[];
  statusHistory?: StatusHistory[];
  migrationIssues?: MigrationIssue[];
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  installments: Installment[];
  orders: Order[];
  movements: InventoryMovement[];
}
export interface CartLine {
  productId: string;
  quantity: number;
}

export interface ClientAddress {
  id: string;
  label: string;
  zip: string;
  street: string;
  number: string;
  extra: string;
  district: string;
  city: string;
  uf: string;
}
export interface Coupon {
  id: string;
  code: string;
  discountType: "fixed" | "percent";
  value: number;
  startsAt: string;
  endsAt: string;
  usageLimit: number | null;
}
export interface Promotion {
  id: string;
  name: string;
  discount: number;
  startsAt: string;
  endsAt: string;
}
export interface ProductPromotion {
  productId: string;
  promotionId: string;
}
export interface InterestRate {
  id: string;
  count: number;
  percent: number;
}
export interface FinancialMovement {
  id: string;
  orderId: string | null;
  installmentId: string | null;
  type: "Entrada" | "Saída";
  description: string;
  amount: number;
  date: string;
  source: "manual" | "payment" | "refund";
  operationKey: string | null;
}
export interface BillingRecord {
  id: string;
  installmentId: string;
  message: string;
  sentAt: string;
}
export interface BirthdayBenefit {
  id: string;
  customerId: string;
  couponId: string | null;
  year: number;
  grantedAt: string;
}
export interface Gift {
  id: string;
  customerId: string;
  description: string;
  date: string;
}
export interface Manager {
  id: string;
  name: string;
  email: string;
}
export interface OperationContext {
  now: string;
  actorId: string | null;
  origin: "manager" | "customer" | "system";
}
export interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  date: string;
}
export interface StatusHistory {
  id: string;
  orderId: string;
  actorId: string | null;
  previousStatus: string;
  newStatus: string;
  date: string;
  origin: OperationContext["origin"];
}
export interface MigrationIssue {
  id: string;
  kind: string;
  entityId: string;
  message: string;
  resolvedAt?: string | null;
}
export interface QuoteInput {
  lines: CartLine[];
  couponCode?: string;
  paymentMethod: PaymentMethod;
  installmentCount?: number;
  firstDueDate?: string;
  shipping?: number;
  date?: string;
}
export interface Quote {
  items: OrderItem[];
  subtotal: number;
  discount: number;
  interest: number;
  shipping: number;
  total: number;
  couponId: string | null;
  interestRateId: string | null;
  interestPercent: number;
  schedule: { amount: number; dueDate: string }[];
}

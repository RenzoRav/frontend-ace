import { migrateState } from "../utils/commerce/migration";
import type {
  BusinessState,
  Brand,
  Category,
  PaymentMethod,
  OrderStatus,
} from "../types/index";
import { addMonths, today, splitInstallments } from "../utils/domain";
export const brands: Brand[] = [
  { id: "boticario", name: "O Boticário", color: "#658475" },
  { id: "eudora", name: "Eudora", color: "#9b81ad" },
  { id: "avon", name: "Avon", color: "#c88791" },
  { id: "natura", name: "Natura", color: "#caa169" },
];
export const categories: Category[] = [
  "Perfumes",
  "Maquiagem",
  "Corpo e Banho",
  "Cabelos",
  "Kits",
  "Cuidados pessoais",
].map((name, index) => ({ id: String(index + 1), name }));
const productNames = [
  "Floratta Red 75ml",
  "Malbec Desodorante Colônia",
  "Lily Eau de Parfum 75ml",
  "Nativa SPA Ameixa 400ml",
  "Intense Batom Cremoso",
  "Cuide-se Bem Kit Nuvem",
  "Eudora Rouge 75ml",
  "Siàge Nutri Óleos Shampoo",
  "Glam Batom Nude",
  "Instance Baunilha 200ml",
  "Siàge Condicionador 200ml",
  "Glam Máscara de Cílios",
  "Far Away Original 50ml",
  "Avon Power Stay Base",
  "Renew Creme Facial",
  "Avon Care Hidratante",
  "Color Trend Batom Rosa",
  "Avon Kit Presente",
  "Luna Intenso 50ml",
  "Essencial Exclusivo 100ml",
  "Tododia Algodão 400ml",
  "Ekos Castanha Óleo",
  "Lumina Shampoo 300ml",
  "Una Batom Matte",
  "Kaiak Clássico 100ml",
];
const categoryIds = [
  "1",
  "1",
  "1",
  "3",
  "2",
  "5",
  "1",
  "4",
  "2",
  "3",
  "4",
  "2",
  "1",
  "2",
  "6",
  "3",
  "2",
  "5",
  "1",
  "1",
  "3",
  "6",
  "4",
  "2",
  "1",
];
const prices = [
  149.9, 189.9, 289.9, 79.9, 39.9, 119.9, 164.9, 49.9, 54.9, 44.9, 49.9, 64.9,
  89.9, 59.9, 99.9, 29.9, 19.9, 79.9, 159.9, 229.9, 64.9, 89.9, 54.9, 49.9,
  139.9,
];
const customerNames = [
  "Mariana Oliveira",
  "Camila Santos",
  "Juliana Ferreira",
  "Beatriz Costa",
  "Ana Paula Lima",
  "Fernanda Souza",
  "Larissa Ribeiro",
  "Patrícia Almeida",
  "Renata Martins",
  "Gabriela Rocha",
  "Isabela Alves",
  "Luana Pereira",
];
export function createMockState(): BusinessState {
  const reference = today();
  const products = productNames.map((name, index) => ({
    id: "p" + index,
    name,
    brandId: brands[Math.min(3, Math.floor(index / 6))]!.id,
    categoryId: categoryIds[index]!,
    sku: "FL-" + String(1001 + index),
    costPrice: Math.round(prices[index]! * 0.62 * 100) / 100,
    salePrice: prices[index]!,
    stock: [
      18, 12, 3, 24, 0, 8, 14, 2, 20, 11, 16, 4, 9, 6, 0, 22, 30, 3, 13, 5, 18,
      7, 11, 21, 8,
    ][index]!,
    minimumStock: 5,
    status: "active" as const,
  }));
  const customers = customerNames.map((name, index) => ({
    id: "c" + index,
    name,
    phone: "1190000" + String(1000 + index),
    birthday:
      "199" +
      (index % 9) +
      "-" +
      (index < 5 ? reference.slice(5, 7) : String(index + 1).padStart(2, "0")) +
      "-" +
      String(Math.min(28, Number(reference.slice(8)) + index + 1)).padStart(
        2,
        "0",
      ),
    createdAt: addMonths(reference, -4),
  }));
  const sales = Array.from({ length: 24 }, (_, index) => {
    const product = products[index % products.length]!;
    const second = products[(index + 5) % products.length]!;
    const items = [
      {
        productId: product.id,
        quantity: (index % 3) + 1,
        unitPrice: product.salePrice,
        costPrice: product.costPrice,
      },
      {
        productId: second.id,
        quantity: 1,
        unitPrice: second.salePrice,
        costPrice: second.costPrice,
      },
    ];
    const date =
      index < 12
        ? reference.slice(0, 8) +
          String(
            Math.max(1, Number(reference.slice(8)) - (index % 5)),
          ).padStart(2, "0")
        : addMonths(reference, -((index % 5) + 1));
    return {
      id: "s" + index,
      number: "V-" + String(index + 1).padStart(4, "0"),
      customerId: customers[index % 12]!.id,
      date,
      paymentMethod: (
        ["Parcelado", "PIX", "Cartão", "Dinheiro"] as PaymentMethod[]
      )[index % 4]!,
      items,
      total:
        Math.round(
          items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0) *
            100,
        ) / 100,
    };
  });
  const installments = sales
    .filter((sale) => sale.paymentMethod === "Parcelado")
    .flatMap((sale, saleIndex) =>
      splitInstallments(
        sale.total,
        3,
        saleIndex % 2 ? addMonths(reference, -1) : reference,
      ).map((portion, index) => ({
        ...portion,
        id: sale.id + "-i" + index,
        saleId: sale.id,
        customerId: sale.customerId,
        number: index + 1,
        count: 3,
        paidAt: index === 0 && saleIndex % 2 === 0 ? reference : null,
      })),
    );
  const orders = Array.from({ length: 10 }, (_, index) => {
    const product = products[index]!;
    return {
      id: "o" + index,
      number: "P-" + String(index + 1).padStart(4, "0"),
      customerId: customers[index]!.id,
      date: reference,
      status: (
        [
          "Novo",
          "Confirmado",
          "Em preparação",
          "Finalizado",
          "Cancelado",
        ] as OrderStatus[]
      )[index % 5]!,
      items: [
        { productId: product.id, quantity: 1, unitPrice: product.salePrice },
      ],
      total: product.salePrice,
    };
  });
  const movements = products.slice(0, 8).map((product, index) => ({
    id: "m" + index,
    productId: product.id,
    type: index % 2 ? ("Saída" as const) : ("Entrada" as const),
    quantity: index + 2,
    date: reference,
    reason: index % 2 ? "Venda anterior" : "Reposição de produtos",
  }));
  return migrateState(
    { products, customers, sales, installments, orders, movements },
    undefined,
    { brands, categories },
  );
}

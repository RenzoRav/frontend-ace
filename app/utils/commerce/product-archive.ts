import type { BusinessState } from "../../types/index.ts";
export function archiveDemoProduct(
  state: Pick<BusinessState, "products">,
  productId: string,
  timestamp: string,
) {
  const product = state.products.find(
    (candidate) => candidate.id === productId,
  );
  if (!product) throw Error("Produto não encontrado.");
  product.status = "inactive";
  product.deletedAt ??= timestamp;
}

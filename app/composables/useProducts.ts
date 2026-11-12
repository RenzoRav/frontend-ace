export function useProducts() {
  const business = useBusiness();
  return {
    products: computed(() =>
      business.state.value.products.filter((product) => !product.deletedAt),
    ),
    saveProduct: business.saveProduct,
  };
}

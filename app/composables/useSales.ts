export function useSales() {
  const business = useBusiness();
  return {
    sales: computed(() => business.state.value.sales),
    finishSale: business.finishSale,
  };
}

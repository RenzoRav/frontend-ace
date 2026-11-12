export function useInventory() {
  const business = useBusiness();
  return {
    movements: computed(() => business.state.value.movements),
    moveStock: business.moveStock,
  };
}

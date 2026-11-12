export function useOrders() {
  const business = useBusiness();
  return {
    orders: computed(() => business.state.value.orders),
    changeOrderStatus: business.changeOrderStatus,
    createOrder: business.createOrder,
  };
}

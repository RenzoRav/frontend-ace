export function useCustomers() {
  const business = useBusiness();
  return {
    customers: computed(() => business.state.value.customers),
    saveCustomer: business.saveCustomer,
  };
}

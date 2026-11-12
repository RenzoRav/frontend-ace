export function useInstallments() {
  const business = useBusiness();
  return {
    installments: computed(() => business.state.value.installments),
    payInstallment: business.payInstallment,
    billingLink: business.billingLink,
  };
}

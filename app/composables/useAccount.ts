import { readStoreStorage } from "~/utils/storage";
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
export function useAccount() {
  const { state } = useBusiness();
  const account = useState("client-account", () => ({
    customerId: state.value.customers[0]!.id,
    name: state.value.customers[0]!.name,
    phone: state.value.customers[0]!.phone,
    email: "cliente@example.com",
    addresses: [] as ClientAddress[],
    primaryId: "",
  }));
  const ready = useState("client-account-ready", () => false);
  const storageError = useState("client-storage-error", () => "");
  onMounted(() => {
    if (ready.value) return;
    try {
      const saved = readStoreStorage(localStorage, "loja-client-v1");
      if (saved) {
        const value = JSON.parse(saved);
        if (
          state.value.customers.some(
            (customer) => customer.id === value.customerId,
          ) &&
          typeof value.name === "string" &&
          typeof value.phone === "string" &&
          typeof value.email === "string" &&
          Array.isArray(value.addresses) &&
          value.addresses.every(
            (a: ClientAddress) =>
              a &&
              [
                a.id,
                a.label,
                a.zip,
                a.street,
                a.number,
                a.extra,
                a.district,
                a.city,
                a.uf,
              ].every((v) => typeof v === "string"),
          )
        ) {
          account.value = { ...account.value, ...value };
        }
      }
    } catch {
      storageError.value =
        "Os dados locais não puderam ser carregados. Você pode continuar nesta sessão.";
    }
    ready.value = true;
  });
  function persist() {
    try {
      localStorage.setItem("loja-client-v1", JSON.stringify(account.value));
      storageError.value = "";
    } catch {
      storageError.value =
        "Alterações mantidas nesta sessão. O navegador não permitiu salvar para a próxima visita.";
    }
  }
  const orders = computed(() =>
    state.value.orders
      .filter((o) => o.customerId === account.value.customerId)
      .sort((a, b) => b.date.localeCompare(a.date)),
  );
  return { account, ready, orders, persist, storageError };
}

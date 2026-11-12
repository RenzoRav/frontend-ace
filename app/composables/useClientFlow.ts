import { readStoreStorage } from "~/utils/storage";
import type { ClientAddress } from "~/composables/useAccount";
export interface CheckoutRecord {
  payment: "Aprovado" | "Pendente" | "Recusado";
  method: string;
  delivery: "Entrega" | "Retirada";
  address: ClientAddress | null;
  shipping: number;
  stage: number;
  items: { name: string; quantity: number; unitPrice: number }[];
}
export function useClientFlow() {
  const flow = useState("client-flow", () => ({
    signedIn: false,
    records: {} as Record<string, CheckoutRecord>,
    tickets: [] as {
      id: string;
      orderId: string;
      subject: string;
      message: string;
      date: string;
    }[],
  }));
  const hydrated = useState("client-flow-ready", () => false);
  const warning = useState("client-flow-warning", () => "");
  onMounted(() => {
    if (hydrated.value) return;
    try {
      const saved = readStoreStorage(localStorage, "loja-flow-v1");
      if (saved) {
        const data = JSON.parse(saved);
        if (
          typeof data.signedIn === "boolean" &&
          data.records &&
          typeof data.records === "object" &&
          !Array.isArray(data.records) &&
          Object.values(data.records).every(
            (r: any) =>
              r &&
              ["Aprovado", "Pendente", "Recusado"].includes(r.payment) &&
              ["Entrega", "Retirada"].includes(r.delivery) &&
              typeof r.method === "string" &&
              typeof r.shipping === "number" &&
              Number.isInteger(r.stage) &&
              Array.isArray(r.items),
          ) &&
          Array.isArray(data.tickets)
        )
          flow.value = data;
      }
    } catch {
      warning.value = "Os dados foram reiniciados nesta sessão.";
    }
    hydrated.value = true;
  });
  function persist() {
    try {
      localStorage.setItem("loja-flow-v1", JSON.stringify(flow.value));
      warning.value = "";
    } catch {
      warning.value =
        "O navegador não permitiu salvar as alterações. Os dados permanecem nesta sessão.";
    }
  }
  function signIn() {
    flow.value.signedIn = true;
    persist();
  }
  function signOut() {
    flow.value.signedIn = false;
    persist();
    return navigateTo("/entrar");
  }
  return { flow, hydrated, warning, persist, signIn, signOut };
}

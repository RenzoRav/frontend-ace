import { emptyBusiness } from "~/utils/api/adapters";
import { clearStoreStorage } from "~/utils/storage";
import { readStoreStorage } from "~/utils/storage";
import { authenticateDemoManager } from "~/utils/commerce/manager";
export function useManager() {
  const { demo } = useStoreMode();
  const api = useNuxtApp().$api;
  const session = useState<string | null>("manager-session", () => null);
  const ready = useState("manager-ready", () => false);
  const warning = useState("manager-storage-warning", () => "");
  async function hydrate() {
    if (ready.value || !import.meta.client) return;
    if (!demo) {
      try {
        session.value = (await api.refresh()).accountId;
      } catch (error) {
        session.value = null;
      }
      ready.value = true;
      return;
    }
    try {
      session.value =
        readStoreStorage(localStorage, "loja-manager-v1") === "manager-demo"
          ? "manager-demo"
          : null;
    } catch {
      warning.value = "Sessão mantida somente nesta página.";
    }
    ready.value = true;
  }
  async function signIn(email: string, password: string) {
    if (!demo) {
      session.value = (await api.login(email, password)).accountId;
      ready.value = true;
      return;
    }
    const manager = authenticateDemoManager(email, password);
    session.value = manager.id;
    ready.value = true;
    try {
      localStorage.setItem("loja-manager-v1", manager.id);
    } catch {
      warning.value = "Sessão mantida apenas nesta página.";
    }
  }
  async function signOut() {
    if (!demo) {
      try {
        await api.logout();
      } catch {
        warning.value =
          "Sessão local encerrada. Confira a conexão antes de acessar novamente.";
      }
      useState("business", emptyBusiness).value = emptyBusiness();
      session.value = null;
      ready.value = true;
      await navigateTo("/gestora/entrar");
      return;
    }
    session.value = null;
    try {
      clearStoreStorage(localStorage, "loja-manager-v1");
    } catch {
      warning.value =
        "Armazenamento indisponível; sessão encerrada nesta página.";
    }
    return navigateTo("/gestora/entrar");
  }
  return { session, ready, warning, hydrate, signIn, signOut };
}

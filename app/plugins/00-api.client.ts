import { emptyBusiness } from "~/utils/api/adapters";
import { createApiClient } from "~/utils/api/client";
export default defineNuxtPlugin(() => {
  const configuration = useRuntimeConfig();
  const api = createApiClient(String(configuration.public.apiBase));
  api.subscribe((session) => {
    if (!session) useState("business", emptyBusiness).value = emptyBusiness();
    useState<string | null>("manager-session", () => null).value =
      session?.accountId ?? null;
  });
  return { provide: { api } };
});

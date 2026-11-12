export default defineNuxtRouteMiddleware(async (to) => {
  if (!import.meta.client || useStoreMode().demo) return;
  if (/^\/(conta|cadastro|entrar|recuperar-senha)(\/|$)/.test(to.path))
    return navigateTo("/pedidos");
  const manager = to.path.startsWith("/admin");
  if (manager && !useState<string | null>("manager-session").value) return;
  try {
    await useApiData().load(manager);
  } catch {
    /* The shared error panel offers retry; no demo fallback. */
  }
});

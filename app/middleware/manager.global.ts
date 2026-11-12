export default defineNuxtRouteMiddleware(async (to) => {
  if (!import.meta.client || !/^\/admin(?:\/|$)/.test(to.path)) return;
  const manager = useManager();
  await manager.hydrate();
  if (!manager.session.value)
    return navigateTo({
      path: "/gestora/entrar",
      query: { next: to.fullPath },
    });
});

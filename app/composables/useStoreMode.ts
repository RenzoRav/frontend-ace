export function useStoreMode() {
  const configuration = useRuntimeConfig();
  return { demo: String(configuration.public.demoMode) === "true" };
}

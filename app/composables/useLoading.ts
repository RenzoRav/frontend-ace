export function useLoading(onLoadingChange?: (loading: boolean) => void) {
  const isLoading = ref(false);
  let disposed = false;
  onScopeDispose(() => {
    disposed = true;
  });
  async function runWithLoading(action: () => unknown | Promise<unknown>) {
    if (isLoading.value || disposed) return;
    isLoading.value = true;
    onLoadingChange?.(true);
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 700));
      if (!disposed) await action();
    } catch (error) {
      useBusiness().notify(
        (error as Error).message || "Confira os dados e tente novamente.",
      );
    } finally {
      isLoading.value = false;
      onLoadingChange?.(false);
    }
  }
  return { isLoading, runWithLoading };
}

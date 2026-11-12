import type { Ref } from "vue";
export function usePagination<T>(source: Ref<T[]>, size = 25) {
  const page = ref(1);
  const pages = computed(() =>
    Math.max(1, Math.ceil(source.value.length / size)),
  );
  const rows = computed(() =>
    source.value.slice((page.value - 1) * size, page.value * size),
  );
  watch(source, () => {
    page.value = 1;
  });
  return { page, pages, rows };
}

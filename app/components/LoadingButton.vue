<script setup lang="ts">
withDefaults(
  defineProps<{
    loading?: boolean;
    disabled?: boolean;
    loadingText?: string;
    type?: "button" | "submit" | "reset";
  }>(),
  {
    loading: false,
    disabled: false,
    loadingText: "Processando...",
    type: "button",
  },
);
</script>
<template>
  <button
    class="button"
    :type="type"
    :disabled="loading || disabled"
    :aria-busy="loading"
    :aria-label="loading ? loadingText : undefined"
  >
    <Icon
      v-if="loading"
      name="loading"
      :size="16"
      class="loading-spinner"
    /><span v-if="loading" role="status" aria-live="polite">{{
      loadingText
    }}</span
    ><slot v-else />
  </button>
</template>

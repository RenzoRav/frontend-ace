<script setup lang="ts">
const props = defineProps<{ page: number; pages: number }>();
const emit = defineEmits<{ "update:page": [value: number] }>();
</script>
<template>
  <nav v-if="props.pages > 1" aria-label="Paginação" class="form-actions">
    <button
      class="button secondary"
      :disabled="props.page <= 1"
      @click="emit('update:page', props.page - 1)"
    >
      Anterior</button
    ><span>Página {{ props.page }} de {{ props.pages }}</span
    ><button
      class="button secondary"
      :disabled="props.page >= props.pages"
      @click="emit('update:page', props.page + 1)"
    >
      Próxima
    </button>
  </nav>
</template>

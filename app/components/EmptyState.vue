<script setup lang="ts">
withDefaults(defineProps<{ title?: string; description?: string }>(), {
  title: "Nenhum resultado encontrado",
  description: "Experimente ajustar sua pesquisa ou os filtros.",
});
</script>
<template>
  <div class="empty">
    <Icon name="search" :size="30" />
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ status: string }>();
</script>
<template>
  <span
    class="badge"
    :class="{
      danger: ['Vencida', 'Sem estoque', 'Cancelado'].includes(status),
      warning: ['Estoque baixo', 'Novo', 'Em aberto'].includes(status),
      purple: status === 'Em preparação',
    }"
    ><span class="badge-dot" />{{ status }}</span
  >
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  amount: string | number;
  icon: string;
  note?: string;
  accent?: boolean;
}>();
</script>
<template>
  <article class="metric" :class="{ accent }">
    <div class="flex justify-between items-center">
      <span class="metric-label">{{ label }}</span
      ><span class="metric-icon"><Icon :name="icon" :size="18" /></span>
    </div>
    <strong>{{ amount }}</strong>
    <p v-if="note">{{ note }}</p>
  </article>
</template>

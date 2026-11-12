<script setup lang="ts">
const props = defineProps<{ title: string; wide?: boolean; busy?: boolean }>();
const emit = defineEmits<{ close: [] }>();
function close() {
  if (!props.busy) emit("close");
}
function handleKey(event: KeyboardEvent) {
  if (event.key === "Escape") close();
}
onMounted(() => {
  document.addEventListener("keydown", handleKey);
  document.body.style.overflow = "hidden";
});
onUnmounted(() => {
  document.removeEventListener("keydown", handleKey);
  document.body.style.overflow = "";
});
</script>
<template>
  <Teleport to="body"
    ><div class="modal-backdrop" @click.self="close">
      <section
        class="modal"
        :class="{ wide }"
        role="dialog"
        aria-modal="true"
        :aria-busy="busy || false"
        :aria-label="title"
      >
        <header>
          <h2>{{ title }}</h2>
          <button
            class="icon-button"
            aria-label="Fechar"
            :disabled="busy"
            @click="close"
          >
            <Icon name="close" />
          </button>
        </header>
        <div class="modal-content"><slot /></div>
      </section></div
  ></Teleport>
</template>

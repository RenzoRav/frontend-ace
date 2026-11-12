<template>
  <NuxtLayout
    ><section v-if="apiError" class="panel panel-body" role="alert">
      <h2>Os dados não foram carregados</h2>
      <p>{{ apiError }}</p>
      <button class="button secondary" @click="retry">Tentar novamente</button>
    </section>
    <p v-else-if="apiLoading" role="status">Carregando dados…</p>
    <div v-show="!apiError"><NuxtPage /></div></NuxtLayout
  ><Transition name="toast"
    ><div v-if="notification" class="toast" role="status">
      <Icon name="check" :size="18" />{{ notification }}
    </div></Transition
  >
</template>
<script setup lang="ts">
const apiError = useState("api-error", () => "");
const apiLoading = useState("api-loading", () => false);
const route = useRoute();
async function retry() {
  try {
    await useApiData().load(route.path.startsWith("/admin"));
  } catch {}
}
const { notification } = useBusiness();
</script>

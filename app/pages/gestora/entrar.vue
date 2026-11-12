<script setup lang="ts">
definePageMeta({ layout: "store" });
const route = useRoute(),
  { signIn, warning } = useManager();
const email = ref(""),
  password = ref(""),
  error = ref("");
const { isLoading, runWithLoading } = useLoading();
async function submit() {
  error.value = "";
  await runWithLoading(async () => {
    try {
      await signIn(email.value, password.value);
      password.value = "";
      const next =
        typeof route.query.next === "string" &&
        /^\/admin(?:\/|$|\?)/.test(route.query.next)
          ? route.query.next
          : "/admin";
      await navigateTo(next);
    } catch (e) {
      error.value = (e as Error).message;
    }
  });
}
</script>
<template>
  <div class="access-page">
    <section class="access-card">
      <h1>Entrar como gestora</h1>

      <form class="access-form" @submit.prevent="submit">
        <fieldset :disabled="isLoading">
          <label
            >E-mail da gestora<input
              v-model="email"
              type="email"
              required /></label
          ><label
            >Senha<input
              v-model="password"
              type="password"
              required
              autocomplete="current-password"
          /></label>
        </fieldset>
        <p v-if="error" role="alert">{{ error }}</p>
        <p v-if="warning" role="alert">{{ warning }}</p>
        <LoadingButton
          type="submit"
          :loading="isLoading"
          loading-text="Entrando..."
          >Entrar no painel</LoadingButton
        >
      </form>
    </section>
  </div>
</template>

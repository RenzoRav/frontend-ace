<script setup lang="ts">
import { today } from "~/utils/domain";
const props = defineProps<{
  mode: "login" | "register" | "recover" | "password";
}>();
const { account, persist } = useAccount();
const { state, saveCustomer } = useBusiness();
const { signIn } = useClientFlow();
const route = useRoute();
const destination = computed(() =>
  route.query.next === "/checkout" ? "/checkout" : "/conta",
);
const { isLoading, runWithLoading } = useLoading();
const name = ref(""),
  email = ref(""),
  phone = ref(""),
  birthday = ref(""),
  password = ref(""),
  confirm = ref(""),
  current = ref(""),
  error = ref(""),
  message = ref("");
const title = computed(
  () =>
    ({
      login: "Entrar na minha conta",
      register: "Criar minha conta",
      recover: "Recuperar senha",
      password: "Alterar senha",
    })[props.mode],
);
async function submit() {
  error.value = "";
  message.value = "";
  await runWithLoading(async () => {
    if (props.mode === "recover") {
      message.value = "Dados de recuperação conferidos.";
      return;
    }
    if (password.value.length < 8) {
      error.value = "Use pelo menos 8 caracteres na senha.";
      return;
    }
    if (
      ["register", "password"].includes(props.mode) &&
      confirm.value !== password.value
    ) {
      error.value = "As senhas não coincidem.";
      return;
    }
    if (props.mode === "password") {
      message.value = "Dados de senha conferidos.";
      password.value = "";
      confirm.value = "";
      current.value = "";
      return;
    }
    if (props.mode === "register") {
      if (
        name.value.trim().length < 2 ||
        phone.value.replace(/\D/g, "").length < 10
      ) {
        error.value = "Informe nome e telefone com DDD.";
        return;
      }
      let saved;
      try {
        saved = await saveCustomer(
          {
            id: "",
            name: name.value.trim(),
            phone: phone.value,
            birthday: birthday.value,
            createdAt: "",
          },
          "customer",
        );
      } catch (e) {
        error.value = (e as Error).message;
        return;
      }
      Object.assign(account.value, {
        name: saved.name,
        phone: saved.phone,
        email: email.value.trim(),
      });
      const id = saved.id;
      account.value.customerId = id;
      account.value.addresses = [];
      account.value.primaryId = "";
      persist();
    } else if (
      email.value.toLowerCase() !== account.value.email.toLowerCase()
    ) {
      error.value = "Confira o e-mail informado ou crie uma conta.";
      return;
    }
    signIn();
    password.value = "";
    confirm.value = "";
    await navigateTo(destination.value);
  });
}
async function demo() {
  await runWithLoading(async () => {
    signIn();
    await navigateTo(destination.value);
  });
}
</script>
<template>
  <div class="access-page">
    <NuxtLink to="/">← Voltar à loja</NuxtLink>
    <section class="access-card">
      <h1>{{ title }}</h1>

      <form class="access-form" @submit.prevent="submit">
        <fieldset :disabled="isLoading">
          <label v-if="mode === 'register'"
            >Nome completo<input
              v-model="name"
              maxlength="120"
              required
              autocomplete="name" /></label
          ><label v-if="mode !== 'password'"
            >E-mail<input
              v-model="email"
              required
              type="email"
              autocomplete="email" /></label
          ><label v-if="mode === 'register'"
            >Telefone com DDD<input
              v-model="phone"
              maxlength="20"
              required
              type="tel" /></label
          ><label v-if="mode === 'register'"
            >Data de aniversário<input
              v-model="birthday"
              type="date"
              required
              :max="today()" /></label
          ><label v-if="mode === 'password'"
            >Senha atual<input
              v-model="current"
              type="password"
              required
              minlength="8"
              autocomplete="current-password" /></label
          ><label v-if="mode !== 'recover'"
            >Senha<input
              v-model="password"
              type="password"
              required
              minlength="8"
              autocomplete="new-password" /></label
          ><label v-if="mode === 'register' || mode === 'password'"
            >Confirmar senha<input
              v-model="confirm"
              type="password"
              required
              minlength="8"
              autocomplete="new-password"
          /></label>
        </fieldset>
        <p v-if="error" role="alert">{{ error }}</p>
        <p v-if="message" role="status">{{ message }}</p>
        <LoadingButton
          type="submit"
          :loading="isLoading"
          loading-text="Processando..."
          >{{
            mode === "recover"
              ? "Continuar"
              : mode === "password"
                ? "Salvar senha"
                : mode === "register"
                  ? "Cadastrar"
                  : "Entrar"
          }}</LoadingButton
        >
      </form>
      <template v-if="mode === 'login'">
        <button
          class="button secondary mt-4"
          :disabled="isLoading"
          @click="demo"
        >
          Acessar minha conta
        </button></template
      >
      <nav class="access-links">
        <NuxtLink to="/entrar">Entrar</NuxtLink
        ><NuxtLink to="/cadastro">Criar conta</NuxtLink
        ><NuxtLink to="/recuperar-senha">Esqueci minha senha</NuxtLink>
      </nav>
    </section>
  </div>
</template>
<style>
.access-page {
  max-width: 580px;
  margin: 36px auto;
  padding: 0 20px;
}
.access-card {
  background: white;
  border: 1px solid #e4e4e4;
  border-radius: 4px;
  padding: 28px;
  margin: 24px 0;
}
.access-form,
.access-form fieldset {
  display: grid;
  gap: 16px;
  margin-top: 22px;
}
.access-form fieldset {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
}
.access-links {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 24px;
  color: var(--color-brand-700);
}
.access-card h1 {
  font-size: 25px;
}
</style>

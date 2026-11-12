<script setup lang="ts">
definePageMeta({ layout: "client" });
const { state, saveCustomer } = useBusiness();
const { account, ready, persist } = useAccount();
const form = reactive({
  name: account.value.name,
  email: account.value.email,
  phone: account.value.phone,
});
watch(ready, () =>
  Object.assign(form, {
    name: account.value.name,
    email: account.value.email,
    phone: account.value.phone,
  }),
);
const { isLoading, runWithLoading } = useLoading();
const message = ref(""),
  error = ref("");
async function save() {
  message.value = "";
  error.value = "";
  await runWithLoading(async () => {
    if (
      form.name.trim().length < 2 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ||
      form.phone.replace(/\D/g, "").length < 10
    ) {
      error.value = "Confira nome, e-mail e telefone.";
      return;
    }
    const customer = state.value.customers.find(
      (c) => c.id === account.value.customerId,
    );
    if (!customer) {
      error.value = "Cliente não encontrado.";
      return;
    }
    try {
      await saveCustomer(
        { ...customer, name: form.name, phone: form.phone },
        "customer",
      );
    } catch (e) {
      error.value = (e as Error).message;
      return;
    }
    Object.assign(account.value, {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    });
    persist();
    message.value = "Dados atualizados.";
  });
}
</script>
<template>
  <div>
    <h1>Meus dados</h1>
    <p>Mantenha suas informações de contato atualizadas.</p>
    <form class="client-card client-form" @submit.prevent="save">
      <fieldset :disabled="isLoading">
        <label
          >Nome completo<input
            v-model="form.name"
            required
            minlength="2"
            autocomplete="name" /></label
        ><label
          >E-mail<input
            v-model="form.email"
            type="email"
            required
            autocomplete="email" /></label
        ><label
          >Telefone<input
            v-model="form.phone"
            required
            type="tel"
            autocomplete="tel"
        /></label>
      </fieldset>
      <p v-if="error" role="alert">{{ error }}</p>
      <LoadingButton
        type="submit"
        :loading="isLoading"
        loading-text="Salvando dados..."
        >Salvar dados</LoadingButton
      >
      <p v-if="message" role="status" class="client-status">{{ message }}</p>
    </form>
  </div>
</template>

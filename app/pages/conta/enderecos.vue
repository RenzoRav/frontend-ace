<script setup lang="ts">
import type { ClientAddress } from "~/composables/useAccount";
definePageMeta({ layout: "client" });
const { account, persist } = useAccount();
const blank = (): ClientAddress => ({
  id: "",
  label: "",
  zip: "",
  street: "",
  number: "",
  extra: "",
  district: "",
  city: "",
  uf: "",
});
const form = reactive(blank());
const { isLoading, runWithLoading } = useLoading();
const message = ref(""),
  error = ref(""),
  removeId = ref("");
function edit(a: ClientAddress) {
  Object.assign(form, a);
  message.value = "";
  error.value = "";
}
async function save() {
  message.value = "";
  error.value = "";
  await runWithLoading(() => {
    if (
      !/^\d{5}-?\d{3}$/.test(form.zip) ||
      ![form.label, form.street, form.number, form.district, form.city].every(
        (v) => v.trim(),
      ) ||
      ![
        "AC",
        "AL",
        "AP",
        "AM",
        "BA",
        "CE",
        "DF",
        "ES",
        "GO",
        "MA",
        "MT",
        "MS",
        "MG",
        "PA",
        "PB",
        "PR",
        "PE",
        "PI",
        "RJ",
        "RN",
        "RS",
        "RO",
        "RR",
        "SC",
        "SP",
        "SE",
        "TO",
      ].includes(form.uf.toUpperCase())
    ) {
      error.value = "Confira os campos obrigatórios, CEP e UF.";
      return;
    }
    const address = {
      ...form,
      id: form.id || crypto.randomUUID(),
      uf: form.uf.toUpperCase(),
    };
    const index = account.value.addresses.findIndex((a) => a.id === address.id);
    if (index >= 0) account.value.addresses[index] = address;
    else account.value.addresses.push(address);
    if (!account.value.primaryId) account.value.primaryId = address.id;
    persist();
    Object.assign(form, blank());
    message.value = "Endereço salvo.";
  });
}
function remove() {
  account.value.addresses = account.value.addresses.filter(
    (a) => a.id !== removeId.value,
  );
  if (account.value.primaryId === removeId.value)
    account.value.primaryId = account.value.addresses[0]?.id || "";
  if (form.id === removeId.value) Object.assign(form, blank());
  removeId.value = "";
  persist();
  message.value = "Endereço excluído.";
}
function primary(id: string) {
  account.value.primaryId = id;
  persist();
  message.value = "Endereço principal atualizado.";
}
</script>
<template>
  <div>
    <h1>Meus endereços</h1>
    <p>Cadastre os locais que você costuma usar nas suas compras.</p>
    <p v-if="message" role="status" class="client-status">{{ message }}</p>
    <div class="client-grid">
      <article v-for="a in account.addresses" :key="a.id" class="client-card">
        <div class="client-row">
          <h2>{{ a.label }}</h2>
          <span v-if="a.id === account.primaryId" class="badge">Principal</span>
        </div>
        <p>
          {{ a.street }}, {{ a.number }} {{ a.extra }}<br />{{ a.district }} ·
          {{ a.city }}/{{ a.uf }}<br />CEP {{ a.zip }}
        </p>
        <div class="client-row mt-4">
          <button
            class="button secondary small"
            :aria-label="`Editar ${a.label}`"
            @click="edit(a)"
          >
            Editar</button
          ><button
            class="button secondary small"
            :aria-label="`Excluir ${a.label}`"
            @click="removeId = a.id"
          >
            Excluir</button
          ><button
            v-if="a.id !== account.primaryId"
            class="button secondary small"
            @click="primary(a.id)"
          >
            Tornar principal
          </button>
        </div>
      </article>
    </div>
    <section v-if="!account.addresses.length" class="client-card">
      <h2>Nenhum endereço cadastrado</h2>
      <p>Adicione seu primeiro endereço abaixo.</p>
    </section>
    <div v-if="removeId" role="alert" class="client-card">
      <p>Deseja excluir este endereço?</p>
      <div class="client-row mt-4">
        <button class="button" @click="remove">Confirmar exclusão</button
        ><button class="button secondary" @click="removeId = ''">
          Cancelar
        </button>
      </div>
    </div>
    <form class="client-card client-form" @submit.prevent="save">
      <h2>{{ form.id ? "Editar endereço" : "Novo endereço" }}</h2>
      <fieldset :disabled="isLoading">
        <label
          >Nome do endereço<input
            v-model="form.label"
            required
            placeholder="Casa, trabalho..."
        /></label>
        <div class="client-grid">
          <label
            >CEP<input
              v-model="form.zip"
              required
              inputmode="numeric"
              autocomplete="postal-code" /></label
          ><label
            >UF<input
              v-model="form.uf"
              required
              maxlength="2"
              autocomplete="address-level1"
          /></label>
        </div>
        <label
          >Rua<input
            v-model="form.street"
            required
            autocomplete="address-line1"
        /></label>
        <div class="client-grid">
          <label>Número<input v-model="form.number" required /></label
          ><label
            >Complemento<input
              v-model="form.extra"
              autocomplete="address-line2"
          /></label>
        </div>
        <div class="client-grid">
          <label>Bairro<input v-model="form.district" required /></label
          ><label
            >Cidade<input
              v-model="form.city"
              required
              autocomplete="address-level2"
          /></label>
        </div>
      </fieldset>
      <p v-if="error" role="alert">{{ error }}</p>
      <div class="client-row">
        <LoadingButton
          type="submit"
          :loading="isLoading"
          loading-text="Salvando endereço..."
          >Salvar endereço</LoadingButton
        ><button
          v-if="form.id"
          type="button"
          class="button secondary"
          :disabled="isLoading"
          @click="Object.assign(form, blank())"
        >
          Cancelar edição
        </button>
      </div>
    </form>
  </div>
</template>

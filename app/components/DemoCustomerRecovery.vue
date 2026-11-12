<script setup lang="ts">
import type { Customer } from "~/types";
import { normalizePhone, recoverDemoCustomer } from "~/utils/commerce/catalog";
const emit = defineEmits<{ recovered: [customer: Customer] }>();
const { demo } = useStoreMode();
const { state } = useBusiness();
const opened = ref(false),
  step = ref<"phone" | "code">("phone"),
  phone = ref(""),
  code = ref(""),
  error = ref("");
function start() {
  error.value = "";
  try {
    normalizePhone(phone.value);
    step.value = "code";
  } catch (problem) {
    error.value = (problem as Error).message;
  }
}
function confirm() {
  error.value = "";
  try {
    emit(
      "recovered",
      recoverDemoCustomer(demo, state.value.customers, phone.value, code.value),
    );
    opened.value = false;
  } catch (problem) {
    error.value = (problem as Error).message;
  }
}
function open() {
  opened.value = true;
  step.value = "phone";
  code.value = "";
  error.value = "";
}
</script>
<template>
  <div v-if="demo" class="panel panel-body mt-4">
    <h2>Já comprou com a gente?</h2>
    <p>Recupere seus dados pelo telefone para preencher o pedido.</p>
    <button class="button secondary mt-4" type="button" @click="open">
      Recuperar meu cadastro
    </button>
    <Modal v-if="opened" title="Recuperar cadastro" @close="opened = false">
      <p>Informe seus dados para continuar com a recuperação do cadastro.</p>
      <form v-if="step === 'phone'" class="client-form" @submit.prevent="start">
        <label
          >Telefone para recuperar cadastro<input
            v-model="phone"
            type="tel"
            required
            maxlength="20"
            autocomplete="tel"
        /></label>
        <p v-if="error" role="alert">{{ error }}</p>
        <button class="button" type="submit">Continuar com o código</button>
      </form>
      <form v-else class="client-form" @submit.prevent="confirm">
        <p>Telefone informado: {{ phone }}</p>
        <p>Confirme o código de acesso para continuar.</p>
        <label
          >Código de acesso<input
            v-model="code"
            required
            inputmode="numeric"
            pattern="[0-9]{6}"
            maxlength="6"
            autocomplete="one-time-code"
        /></label>
        <p v-if="error" role="alert">{{ error }}</p>
        <button class="button" type="submit">Confirmar código</button>
        <button
          class="button secondary"
          type="button"
          @click="
            step = 'phone';
            error = '';
          "
        >
          Alterar telefone
        </button>
      </form>
    </Modal>
  </div>
</template>

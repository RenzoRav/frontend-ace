<script setup lang="ts">
definePageMeta({ layout: "client" });
const { changeOrderStatus } = useBusiness();
const { orders } = useAccount(),
  { flow, persist } = useClientFlow();
const route = useRoute();
const orderId = ref(
    typeof route.query.pedido === "string" ? route.query.pedido : "",
  ),
  subject = ref("Dúvida sobre pedido"),
  text = ref(""),
  message = ref(""),
  error = ref(""),
  cancelConfirm = ref(false);
const { isLoading, runWithLoading } = useLoading();
const selected = computed(() =>
  orders.value.find((o) => o.id === orderId.value),
);
const tickets = computed(() =>
  flow.value.tickets.filter((t) =>
    orders.value.some((o) => o.id === t.orderId),
  ),
);
async function submit() {
  message.value = "";
  error.value = "";
  await runWithLoading(async () => {
    if (!selected.value) {
      error.value = "Selecione um pedido do seu perfil.";
      return;
    }
    if (text.value.trim().length < 10) {
      error.value = "Descreva sua solicitação com pelo menos 10 caracteres.";
      return;
    }
    flow.value.tickets.unshift({
      id: crypto.randomUUID(),
      orderId: orderId.value,
      subject: subject.value,
      message: text.value.trim(),
      date: new Date().toLocaleDateString("pt-BR"),
    });
    persist();
    text.value = "";
    message.value = "Solicitação registrada.";
  });
}
async function cancel() {
  if (selected.value && selected.value.status === "Novo") {
    await changeOrderStatus(selected.value.id, "Cancelado", "customer");
    persist();
    message.value = "Pedido cancelado.";
  } else
    error.value =
      "Para pedidos confirmados, solicite o cancelamento pelo formulário.";
  cancelConfirm.value = false;
}
</script>
<template>
  <div>
    <h1>Ajuda e atendimento</h1>
    <p>
      Simule dúvidas, trocas e solicitações de cancelamento. Nenhuma mensagem é
      enviada de verdade.
    </p>
    <form class="client-card client-form" @submit.prevent="submit">
      <fieldset :disabled="isLoading">
        <label
          >Pedido<select v-model="orderId">
            <option value="">Selecione um pedido</option>
            <option v-for="o in orders" :key="o.id" :value="o.id">
              {{ o.number }} — {{ o.status }}
            </option>
          </select></label
        ><label
          >Assunto<select v-model="subject">
            <option>Dúvida sobre pedido</option>
            <option>Solicitar cancelamento</option>
            <option>Solicitar troca ou devolução</option>
          </select></label
        ><label
          >Mensagem<textarea v-model="text" required minlength="10" rows="4" />
        </label>
      </fieldset>
      <p v-if="error" role="alert">{{ error }}</p>
      <p v-if="message" role="status">{{ message }}</p>
      <LoadingButton
        type="submit"
        :loading="isLoading"
        loading-text="Registrando solicitação..."
        >Registrar solicitação</LoadingButton
      ><button
        v-if="selected?.status === 'Novo'"
        type="button"
        class="button secondary"
        :disabled="isLoading"
        @click="cancelConfirm = true"
      >
        Cancelar pedido
      </button>
    </form>
    <section v-if="cancelConfirm" class="client-card" role="alert">
      <p>Confirmar o cancelamento deste pedido?</p>
      <div class="client-row mt-4">
        <button class="button" @click="cancel">Confirmar cancelamento</button
        ><button class="button secondary" @click="cancelConfirm = false">
          Voltar
        </button>
      </div>
    </section>
    <section class="client-card">
      <h2>Minhas solicitações</h2>
      <p v-if="!tickets.length">Você ainda não registrou solicitações.</p>
      <article v-for="t in tickets" :key="t.id" class="mt-4">
        <strong>{{ t.subject }}</strong>
        <p>{{ t.message }}</p>
        <small>{{ t.date }} · Registrada</small>
      </article>
    </section>
  </div>
</template>

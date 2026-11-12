<script setup lang="ts">
import { money } from "~/utils/domain";
import type { CheckoutRecord } from "~/composables/useClientFlow";
definePageMeta({ layout: "client" });
const route = useRoute(),
  { orders } = useAccount(),
  { flow, persist } = useClientFlow();
const order = computed(() =>
  orders.value.find((o) => o.id === route.params.id),
);
const record = computed(() =>
  order.value?.paymentMethod
    ? {
        payment: order.value.paymentStatus || "Pendente",
        method: order.value.paymentMethod,
        delivery: order.value.delivery || "Retirada",
        address: order.value.address,
        shipping: order.value.shipping || 0,
        stage: order.value.stage || 0,
        items: order.value.items,
      }
    : undefined,
);
const { simulatePayment } = useBusiness();
const outcome = ref<CheckoutRecord["payment"]>("Aprovado");
const { isLoading, runWithLoading } = useLoading();
const message = ref("");
async function simulate() {
  await runWithLoading(() => {
    if (
      !order.value ||
      !record.value ||
      order.value.status === "Cancelado" ||
      record.value.payment === "Aprovado"
    )
      return;
    try {
      simulatePayment(order.value.id, outcome.value);
    } catch (e) {
      message.value = (e as Error).message;
      return;
    }
    message.value = "Situação atualizada.";
  });
}
</script>
<template>
  <div v-if="order && record">
    <h1>Pagamento {{ record.payment.toLowerCase() }}</h1>
    <p>
      Pedido {{ order.number }} · {{ record.method }} ·
      {{ money(order.total) }}
    </p>
    <section class="client-card">
      <h2>
        {{
          record.payment === "Aprovado"
            ? "Pagamento registrado"
            : record.payment === "Recusado"
              ? "Tente novamente"
              : "Aguardando pagamento"
        }}
      </h2>

      <form
        v-if="record.payment !== 'Aprovado' && order.status !== 'Cancelado'"
        class="client-form mt-4"
        @submit.prevent="simulate"
      >
        <label
          >Situação do pagamento<select v-model="outcome" :disabled="isLoading">
            <option>Aprovado</option>
            <option>Pendente</option>
            <option>Recusado</option>
          </select></label
        ><LoadingButton
          type="submit"
          :loading="isLoading"
          loading-text="Atualizando situação..."
          >Atualizar situação</LoadingButton
        >
      </form>
      <p v-if="message" role="status" class="client-status">{{ message }}</p>
      <div class="client-row mt-5">
        <NuxtLink :to="'/conta/pedidos/' + order.id" class="button secondary"
          >Ver meu pedido</NuxtLink
        ><NuxtLink to="/" class="button secondary">Voltar à loja</NuxtLink>
      </div>
    </section>
  </div>
  <section v-else class="client-card">
    <h1>Pagamento não encontrado</h1>
    <p>Este pedido não possui checkout vinculado neste perfil.</p>
    <NuxtLink to="/conta/pedidos">Meus pedidos</NuxtLink>
  </section>
</template>

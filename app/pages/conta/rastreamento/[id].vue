<script setup lang="ts">
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
const { advanceOrder } = useBusiness();
const stages = computed(() =>
  record.value?.delivery === "Retirada"
    ? [
        "Pedido recebido",
        "Pagamento aprovado",
        "Em separação",
        "Pronto para retirada",
        "Retirado",
      ]
    : [
        "Pedido recebido",
        "Pagamento aprovado",
        "Em separação",
        "Enviado",
        "Entregue",
      ],
);
function advance() {
  if (
    !record.value ||
    !order.value ||
    record.value.payment !== "Aprovado" ||
    order.value.status === "Cancelado" ||
    record.value.stage >= 4
  )
    return;
  try {
    advanceOrder(order.value.id);
  } catch (e) {
    useBusiness().notify((e as Error).message);
  }
}
</script>
<template>
  <div v-if="order && record">
    <h1>
      {{
        record.delivery === "Retirada"
          ? "Acompanhar retirada"
          : "Rastrear entrega"
      }}
    </h1>
    <p>Pedido {{ order.number }} · acompanhe o andamento.</p>
    <section class="client-card">
      <p v-if="order.status === 'Cancelado'">Pedido cancelado.</p>
      <template v-else
        ><ol>
          <li v-for="(stage, i) in stages" :key="stage" class="py-3">
            {{ i <= record.stage ? "✓" : "○" }} {{ stage }}
          </li>
        </ol>
        <p v-if="record.delivery === 'Entrega'">
          Referência do pedido: {{ order.number }}.
        </p>
        <button
          class="button secondary mt-4"
          :disabled="record.payment !== 'Aprovado' || record.stage >= 4"
          @click="advance"
        >
          Atualizar andamento
        </button></template
      >
    </section>
    <NuxtLink :to="'/conta/pedidos/' + order.id" class="button secondary mt-4"
      >Voltar ao pedido</NuxtLink
    >
  </div>
  <section v-else class="client-card">
    <h1>Acompanhamento indisponível</h1>
    <NuxtLink to="/conta/pedidos">Voltar aos pedidos</NuxtLink>
  </section>
</template>

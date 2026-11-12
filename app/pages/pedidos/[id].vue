<script setup lang="ts">
import type { Order } from "~/types";
import type { OrderDto } from "~/utils/api/adapters";
import { orderFromApi } from "~/utils/api/adapters";
import { orderWhatsApp } from "~/utils/commerce/settings";
definePageMeta({ layout: "store" });
const route = useRoute();
const access = useGuestAccess();
const { demo } = useStoreMode();
const { state, settings } = useBusiness();
const api = useNuxtApp().$api;
const order = ref<Order>();
const error = ref("");
const loading = ref(false);
async function reload() {
  loading.value = true;
  error.value = "";
  try {
    if (demo)
      order.value = state.value.orders.find(
        (candidate) => candidate.id === route.params.id,
      );
    else {
      const token = access.token(String(route.params.id));
      if (!token)
        throw Error(
          "O acesso a este pedido não está disponível neste navegador. Entre em contato com a loja.",
        );
      order.value = orderFromApi(
        await api.request<OrderDto>(
          "/checkout/orders/" + encodeURIComponent(String(route.params.id)),
          { headers: { "X-Guest-Token": token } },
        ),
      );
    }
    if (!order.value) throw Error("Pedido não encontrado.");
  } catch (problem) {
    error.value = (problem as Error).message;
  } finally {
    loading.value = false;
  }
}
const whatsapp = computed(() =>
  order.value ? orderWhatsApp(order.value, settings.value.managerPhone) : "",
);
onMounted(reload);
</script>
<template>
  <section class="panel panel-body">
    <h1>{{ order ? "Pedido registrado" : "Acompanhar pedido" }}</h1>

    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="loading" role="status">Consultando pedido…</p>
    <template v-if="order"
      ><h2>{{ order.number }} · {{ order.status }}</h2>
      <p>
        {{
          order.paymentStatus === "Aprovado"
            ? "Pagamento registrado"
            : "Pagamento pendente"
        }}
      </p>
      <OrderSummary :order="order" />
      <a
        v-if="whatsapp"
        :href="whatsapp"
        target="_blank"
        rel="noopener noreferrer"
        class="button mt-4"
        >Enviar pedido pelo WhatsApp</a
      >
      <p v-else>
        Configure o WhatsApp comercial em Configurações para encaminhar o
        pedido.
      </p>
      <p>
        A mensagem será preparada; você confirma o envio no WhatsApp. Abrir o
        link não registra pagamento.
      </p>
    </template>
    <button class="button secondary mt-4" :disabled="loading" @click="reload">
      Atualizar pedido</button
    ><NuxtLink to="/" class="button secondary mt-4"
      >Continuar comprando</NuxtLink
    >
  </section>
</template>

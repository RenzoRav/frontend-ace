<script setup lang="ts">
import { money, formatDate } from "~/utils/domain";
definePageMeta({ layout: "client" });
const route = useRoute();
const { orders } = useAccount();
const { productName } = useBusiness();
const { flow } = useClientFlow();

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
const stages = ["Novo", "Confirmado", "Em preparação", "Finalizado"];
</script>
<template>
  <div>
    <NuxtLink to="/conta/pedidos">← Meus pedidos</NuxtLink
    ><template v-if="order"
      ><h1 class="mt-5">Pedido {{ order.number }}</h1>
      <p>{{ formatDate(order.date) }}</p>
      <section class="client-card">
        <h2>Andamento do pedido</h2>
        <span class="badge">{{ order.status }}</span>
        <ol v-if="order.status !== 'Cancelado'" class="mt-4">
          <li v-for="(stage, i) in stages" :key="stage" class="py-2">
            {{ i <= stages.indexOf(order.status) ? "✓" : "○" }} {{ stage }}
          </li>
        </ol>
        <p v-else class="mt-4">Este pedido foi cancelado.</p>
      </section>
      <section class="client-card">
        <h2>Itens do pedido</h2>
        <ul class="client-items">
          <li
            v-for="item in order.items"
            :key="item.productId"
            class="client-row"
          >
            <div>
              <strong>{{ item.name || productName(item.productId) }}</strong>
              <p>{{ item.quantity }} × {{ money(item.unitPrice) }}</p>
            </div>
            <strong>{{ money(item.quantity * item.unitPrice) }}</strong>
          </li>
        </ul>
        <div class="client-row mt-5">
          <strong>Total com frete e juros</strong
          ><strong>{{ money(order.total) }}</strong>
        </div>
      </section>
      <OrderSummary :order="order" /><OrderHistory :order-id="order.id" />
      <div class="client-grid">
        <section class="client-card">
          <h2>Pagamento</h2>
          <template v-if="record"
            ><p>{{ record.method }} · {{ record.payment }}</p>
            <NuxtLink
              :to="'/conta/pagamento/' + order.id"
              class="button secondary mt-4"
              >Ver pagamento</NuxtLink
            ></template
          >
        </section>
        <section class="client-card">
          <h2>Entrega</h2>
          <template v-if="record"
            ><p>{{ record.delivery }}</p>
            <p v-if="record.address">
              {{ record.address.street }}, {{ record.address.number }}
              {{ record.address.extra }} · {{ record.address.city }}/{{
                record.address.uf
              }}
              · {{ record.address.zip }}
            </p>
            <NuxtLink
              :to="'/conta/rastreamento/' + order.id"
              class="button secondary mt-4"
              >Acompanhar pedido</NuxtLink
            ></template
          >
          <p v-else>
            Endereço e rastreamento não foram registrados neste pedido do
            pedido.
          </p>
          <NuxtLink to="/conta/enderecos" class="button secondary mt-4"
            >Meus endereços</NuxtLink
          >
        </section>
      </div>
      <NuxtLink
        :to="'/conta/ajuda?pedido=' + order.id"
        class="button secondary mt-5"
        >Preciso de ajuda com este pedido</NuxtLink
      >
    </template>
    <section v-else class="client-card">
      <h1>Pedido não encontrado</h1>
      <p>Este pedido não está disponível neste perfil.</p>
      <NuxtLink to="/conta/pedidos" class="button secondary mt-4"
        >Voltar aos pedidos</NuxtLink
      >
    </section>
  </div>
</template>

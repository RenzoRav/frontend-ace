<script setup lang="ts">
import { money, formatDate } from "~/utils/domain";
definePageMeta({ layout: "client" });
const { orders } = useAccount();
const filter = ref("");
const filtered = computed(() =>
  orders.value.filter((o) => !filter.value || o.status === filter.value),
);
</script>
<template>
  <div>
    <h1>Meus pedidos</h1>
    <p>Consulte suas compras e o andamento de cada pedido.</p>
    <label class="mt-5"
      >Filtrar por situação<select v-model="filter">
        <option value="">Todos os pedidos</option>
        <option
          v-for="status in [
            'Novo',
            'Confirmado',
            'Em preparação',
            'Finalizado',
            'Cancelado',
          ]"
          :key="status"
        >
          {{ status }}
        </option>
      </select></label
    >
    <article v-for="order in filtered" :key="order.id" class="client-card">
      <div class="client-row">
        <h2>{{ order.number }}</h2>
        <span class="badge">{{ order.status }}</span>
      </div>
      <p>{{ formatDate(order.date) }} · {{ order.items.length }} itens</p>
      <div class="client-row mt-4">
        <strong>{{ money(order.total) }}</strong
        ><NuxtLink :to="`/conta/pedidos/${order.id}`" class="button secondary"
          >Ver pedido</NuxtLink
        >
      </div>
    </article>
    <section v-if="!filtered.length" class="client-card">
      <h2>Nenhum pedido encontrado</h2>
      <p>Não há pedidos nesta situação.</p>
      <NuxtLink to="/" class="button secondary mt-4">Explorar a loja</NuxtLink>
    </section>
  </div>
</template>

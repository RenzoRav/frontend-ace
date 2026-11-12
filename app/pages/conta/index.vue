<script setup lang="ts">
definePageMeta({ layout: "client" });
const { account, orders } = useAccount();
</script>
<template>
  <div>
    <h1>Minha conta</h1>
    <p>
      Olá, {{ account.name.split(" ")[0] }}! Acompanhe suas compras e mantenha
      seus dados em dia.
    </p>
    <div class="client-grid">
      <NuxtLink class="client-card" to="/conta/pedidos"
        ><h2>Meus pedidos</h2>
        <p>{{ orders.length }} pedidos no seu histórico</p>
        <span>Ver minhas compras →</span></NuxtLink
      ><NuxtLink class="client-card" to="/conta/enderecos"
        ><h2>Meus endereços</h2>
        <p>{{ account.addresses.length }} endereços cadastrados</p>
        <span>Gerenciar endereços →</span></NuxtLink
      >
    </div>
    <section class="client-card">
      <h2>Seu último pedido</h2>
      <template v-if="orders[0]"
        ><div class="client-row">
          <strong>{{ orders[0].number }}</strong
          ><span class="badge">{{ orders[0].status }}</span
          ><NuxtLink
            :to="`/conta/pedidos/${orders[0].id}`"
            class="button secondary"
            >Ver pedido</NuxtLink
          >
        </div></template
      >
      <p v-else>
        Você ainda não tem pedidos. Explore a loja para encontrar seus
        favoritos.
      </p>
    </section>
    <section class="client-card">
      <h2>Precisa de ajuda?</h2>

      <NuxtLink to="/" class="button secondary mt-4">Voltar à loja</NuxtLink>
    </section>
  </div>
</template>

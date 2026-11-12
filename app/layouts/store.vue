<script setup lang="ts">
const { demo } = useStoreMode();
</script>
<template>
  <div class="store-shell">
    <header class="store-header">
      <NuxtLink to="/" class="site-title">SA Perfumaria</NuxtLink
      ><span>Catálogo de produtos</span>
      <div class="store-account-links">
        <NuxtLink
          :to="demo ? '/conta' : '/pedidos'"
          class="button secondary small"
          >{{ demo ? "Minha conta" : "Meu pedido" }}</NuxtLink
        ><NuxtLink to="/admin" class="button secondary small"
          >Painel da revendedora <Icon name="external" :size="15"
        /></NuxtLink>
      </div>
    </header>
    <main><slot /></main>
    <footer class="store-footer">SA Perfumaria</footer>
  </div>
</template>

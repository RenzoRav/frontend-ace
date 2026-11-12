<script setup lang="ts">
definePageMeta({ layout: "store" });
const access = useGuestAccess();
onMounted(() => {
  const id = access.lastId();
  if (id) navigateTo("/pedidos/" + encodeURIComponent(id));
});
</script>
<template>
  <section>
    <h1>Meu pedido</h1>
    <p>
      O acompanhamento fica disponível neste navegador após finalizar a compra.
      Para pedidos feitos em outro dispositivo, entre em contato com a loja.
    </p>
    <NuxtLink to="/" class="button mt-4">Ver produtos</NuxtLink>
  </section>
</template>

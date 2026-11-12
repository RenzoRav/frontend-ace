<script setup lang="ts">
defineProps<{ orderId: string }>();
const { state } = useBusiness();
</script>
<template>
  <section class="section-gap">
    <h2>Histórico do pedido</h2>
    <ul>
      <li
        v-for="h in (state.statusHistory || [])
          .filter((h) => h.orderId === orderId)
          .slice()
          .reverse()"
        :key="h.id"
        class="mini-list"
      >
        {{ h.previousStatus || "Criação" }} → {{ h.newStatus }} ·
        {{
          new Date(h.date).toLocaleString("pt-BR", {
            timeZone: "America/Sao_Paulo",
          })
        }}
        ·
        {{
          h.origin === "manager"
            ? "Gestora"
            : h.origin === "customer"
              ? "Cliente"
              : "Sistema"
        }}
      </li>
    </ul>
    <p v-if="!(state.statusHistory || []).some((h) => h.orderId === orderId)">
      Registro legado: não há histórico anterior comprovado.
    </p>
  </section>
</template>

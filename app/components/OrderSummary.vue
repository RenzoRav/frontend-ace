<script setup lang="ts">
import { money } from "~/utils/domain";
import type { Order, Quote } from "~/types";
defineProps<{ order: Order | Quote }>();
</script>
<template>
  <dl class="section-gap">
    <div class="client-row">
      <dt>Produtos</dt>
      <dd>{{ money(order.subtotal ?? order.total) }}</dd>
    </div>
    <div class="client-row">
      <dt>Desconto</dt>
      <dd>− {{ money(order.discount || 0) }}</dd>
    </div>
    <div class="client-row">
      <dt>Frete</dt>
      <dd>{{ money(order.shipping || 0) }}</dd>
    </div>
    <div class="client-row">
      <dt>Juros</dt>
      <dd>{{ money(order.interest || 0) }}</dd>
    </div>
    <div class="cart-total">
      <dt>Total</dt>
      <dd>{{ money(order.total) }}</dd>
    </div>
  </dl>
</template>

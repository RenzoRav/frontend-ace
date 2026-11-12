<script setup lang="ts">
import type { Sale } from "~/types";
import { money, formatDate, installmentStatus } from "~/utils/domain";
const props = defineProps<{ sale: Sale }>();
const { customerName, productName, state } = useBusiness();
const portions = computed(() =>
  state.value.installments.filter(
    (portion) => portion.orderId === props.sale.orderId,
  ),
);
</script>
<template>
  <p>
    {{ customerName(sale.customerId) }} · {{ formatDate(sale.date) }} ·
    {{ sale.paymentMethod }}
  </p>
  <div class="table-scroll section-gap">
    <table>
      <thead>
        <tr>
          <th>Produto</th>
          <th>Qtd.</th>
          <th>Subtotal</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="line in sale.items" :key="line.productId">
          <td>{{ (line as any).name || productName(line.productId) }}</td>
          <td>{{ line.quantity }}</td>
          <td>{{ money(line.unitPrice * line.quantity) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="cart-total">
    <span>Total</span><span>{{ money(sale.total) }}</span>
  </div>
  <h3 v-if="portions.length">Parcelas</h3>
  <div v-for="portion in portions" :key="portion.id" class="mini-list">
    <div>
      <strong
        >{{ portion.number }}/{{ portion.count }} ·
        {{ money(portion.amount) }}</strong
      ><small>{{ formatDate(portion.dueDate) }}</small>
    </div>
    <div class="list-right">
      <StatusBadge :status="installmentStatus(portion)" />
    </div>
  </div>
</template>

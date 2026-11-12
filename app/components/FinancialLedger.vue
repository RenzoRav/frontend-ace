<script setup lang="ts">
import { money, today } from "~/utils/domain";
const { state, addFinance } = useBusiness();
const { isLoading, runWithLoading } = useLoading();
const error = ref(""),
  filter = ref(""),
  month = ref(today().slice(0, 7));
const form = reactive({
  type: "Entrada" as "Entrada" | "Saída",
  description: "",
  amount: 0,
  date: today(),
  orderId: "",
});
const movements = computed(() =>
  (state.value.financialMovements || []).filter(
    (m) =>
      (!filter.value || m.type === filter.value) &&
      (!month.value || m.date.startsWith(month.value)),
  ),
);
const balance = computed(
  () =>
    movements.value.reduce(
      (sum, m) =>
        sum + Math.round(m.amount * 100) * (m.type === "Entrada" ? 1 : -1),
      0,
    ) / 100,
);
async function submit() {
  error.value = "";
  await runWithLoading(async () => {
    try {
      await addFinance({ ...form, orderId: form.orderId || null });
      form.description = "";
      form.amount = 0;
    } catch (e) {
      error.value = (e as Error).message;
    }
  });
}
</script>
<template>
  <section class="panel section-gap">
    <div class="panel-header">
      <h2>Lançamentos financeiros</h2>
      <strong>Saldo: {{ money(balance) }}</strong>
    </div>
    <div class="panel-body">
      <p>
        Caixa recebido e despesas. Faturamento de vendas não é somado novamente
        aqui. Dados legados não geram recebimentos retroativos.
      </p>
      <form class="client-form" @submit.prevent="submit">
        <fieldset :disabled="isLoading">
          <div class="form-grid">
            <label
              >Tipo do lançamento<select v-model="form.type">
                <option>Entrada</option>
                <option>Saída</option>
              </select></label
            ><label
              >Descrição do lançamento<input
                v-model="form.description"
                maxlength="150"
                required /></label
            ><label
              >Valor do lançamento<input
                v-model.number="form.amount"
                type="number"
                min="0.01"
                step="0.01"
                required /></label
            ><label
              >Data do lançamento<input
                v-model="form.date"
                :max="today()"
                type="date"
                required /></label
            ><label
              >Pedido do lançamento (opcional)<select v-model="form.orderId">
                <option value="">Sem pedido</option>
                <option v-for="o in state.orders" :key="o.id" :value="o.id">
                  {{ o.number }}
                </option>
              </select></label
            >
          </div>
        </fieldset>
        <p v-if="error" role="alert">{{ error }}</p>
        <LoadingButton type="submit" :loading="isLoading"
          >Registrar lançamento</LoadingButton
        >
      </form>
      <div class="toolbar">
        <label>Mês do caixa<input v-model="month" type="month" /></label
        ><label
          >Filtrar lançamentos<select v-model="filter">
            <option value="">Todos</option>
            <option>Entrada</option>
            <option>Saída</option>
          </select></label
        >
      </div>
      <div v-for="m in movements" :key="m.id" class="mini-list">
        <div>
          <strong>{{ m.description }}</strong
          ><small
            >{{ m.date }} ·
            {{
              m.source === "manual"
                ? "Manual"
                : m.source === "payment"
                  ? "Vinculado a pedido/parcela"
                  : "Estorno"
            }}</small
          >
        </div>
        <strong
          >{{ m.type === "Saída" ? "−" : "+" }} {{ money(m.amount) }}</strong
        >
      </div>
      <p v-if="!movements.length">Nenhum lançamento no filtro.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { money, formatDate } from "~/utils/domain";
interface GroupTotal {
  name: string;
  amount: number;
  quantity: number;
}
interface PeriodReport {
  orders: number;
  revenue: number;
  merchandiseProfit: number;
  received: number;
  outgoing: number;
  cashBalance: number;
  receivable: number;
  monthlyReceivable: number;
  overdue: number;
  upcoming: number;
  birthdayCount: number;
  birthdays: { id: string; name: string; birthday: string }[];
  brandTotals: GroupTotal[];
  categoryTotals: GroupTotal[];
  products: GroupTotal[];
  customers: GroupTotal[];
}
const props = defineProps<{ month: string; detailed?: boolean }>();
const api = useNuxtApp().$api;
const state = useState("business");
const report = ref<PeriodReport>();
const error = ref("");
const loading = ref(false);
let generation = 0;
async function reload() {
  const current = ++generation;
  loading.value = true;
  error.value = "";
  report.value = undefined;
  try {
    const value = await api.request<PeriodReport>(
      "/manager/reports/period?month=" + encodeURIComponent(props.month),
    );
    if (current === generation) report.value = value;
  } catch (problem) {
    if (current === generation) error.value = (problem as Error).message;
  } finally {
    if (current === generation) loading.value = false;
  }
}
watch([() => props.month, state], reload, { immediate: true });
</script>
<template>
  <section aria-label="Indicadores do período">
    <p v-if="loading" role="status">
      Calculando indicadores do período completo…
    </p>
    <p v-if="error" role="alert">
      {{ error }}
      <button class="button secondary" @click="reload">
        Tentar indicadores novamente
      </button>
    </p>
    <template v-if="report">
      <div class="metric-grid">
        <MetricCard
          label="Pedidos no mês"
          :amount="report.orders"
          note="Inclui novos e cancelados"
          icon="orders"
        />
        <MetricCard
          label="Faturamento do mês"
          :amount="money(report.revenue)"
          note="Pedidos confirmados, em preparação e finalizados"
          icon="sales"
        />
        <MetricCard
          label="Margem de mercadorias"
          :amount="money(report.merchandiseProfit)"
          note="Mercadorias menos custo e descontos; exclui frete e juros"
          icon="reports"
        />
        <MetricCard
          label="Resultado de caixa"
          :amount="money(report.cashBalance)"
          note="Entradas efetivas menos saídas no período"
          icon="finance"
        />
        <MetricCard
          label="A receber no mês"
          :amount="money(report.monthlyReceivable)"
          note="Parcelas abertas com vencimento no mês"
          icon="calendar"
        />
        <MetricCard
          label="Total a receber"
          :amount="money(report.receivable)"
          icon="finance"
        />
        <MetricCard
          label="Parcelas vencidas"
          :amount="money(report.overdue)"
          icon="alert"
        />
        <MetricCard
          label="Próximos vencimentos"
          :amount="money(report.upcoming)"
          note="Conforme antecedência configurada"
          icon="calendar"
        />
      </div>
      <p>
        Indicadores do período selecionado. Registre pagamentos após conferir o
        recebimento.
      </p>
      <template v-if="detailed">
        <p>
          Recebido: {{ money(report.received) }} · Saídas:
          {{ money(report.outgoing) }} ·
          {{ report.birthdayCount }} aniversariantes.
        </p>
        <div class="equal-columns">
          <section
            v-for="group in [
              { label: 'Vendas por marca', rows: report.brandTotals },
              { label: 'Vendas por categoria', rows: report.categoryTotals },
              { label: 'Produtos mais vendidos', rows: report.products },
              { label: 'Clientes por faturamento', rows: report.customers },
            ]"
            :key="group.label"
            class="panel panel-body"
          >
            <h2>{{ group.label }}</h2>
            <p>
              Até 100 resultados. Mercadorias líquidas de desconto; clientes
              pelo total do pedido.
            </p>
            <div
              v-for="(row, index) in group.rows"
              :key="index"
              class="mini-list"
            >
              <strong>{{ row.name }}</strong
              ><span>{{ row.quantity }} · {{ money(row.amount) }}</span>
            </div>
            <p v-if="!group.rows.length">Sem movimentos no período.</p>
          </section>
        </div>
        <section class="panel panel-body">
          <h2>Aniversários no período</h2>
          <p v-for="customer in report.birthdays" :key="customer.id">
            {{ customer.name }} · {{ formatDate(customer.birthday) }}
          </p>
          <p>Exibidos até 100 aniversariantes; a contagem considera todos.</p>
        </section>
      </template>
    </template>
  </section>
</template>

<script setup lang="ts">
import {
  groupedMerchandise,
  estimatedProfit,
  csvCell,
} from "~/utils/commerce/reports";
import { money, today, formatDate } from "~/utils/domain";
const { demo } = useStoreMode();
const {
  state,
  brands,
  categories,
  customerName,
  brandName,
  receivable,
  overdue,
  notify,
} = useBusiness();
const selectedMonth = ref(today().slice(0, 7));
const sales = computed(() =>
  state.value.sales.filter((sale) => sale.date.startsWith(selectedMonth.value)),
);
const revenue = computed(() =>
  sales.value.reduce((sum, sale) => sum + sale.total, 0),
);
const reportOrders = computed(() =>
  state.value.orders.filter(
    (o) =>
      o.date.startsWith(selectedMonth.value) &&
      o.accountedAt &&
      o.status !== "Cancelado",
  ),
);
const profit = computed(() => estimatedProfit(reportOrders.value));
const unknownCosts = computed(() =>
  reportOrders.value.some((o) => o.items.some((i) => i.costPrice == null)),
);
const shippingRevenue = computed(
  () =>
    reportOrders.value.reduce(
      (sum, o) => sum + Math.round((o.shipping ?? 0) * 100),
      0,
    ) / 100,
);
const interestRevenue = computed(
  () =>
    reportOrders.value.reduce(
      (sum, o) => sum + Math.round((o.interest ?? 0) * 100),
      0,
    ) / 100,
);
const productRanking = computed(() =>
  state.value.products
    .map((product) => ({
      ...product,
      quantity: sales.value.reduce(
        (sum, sale) =>
          sum +
          sale.items
            .filter((line) => line.productId === product.id)
            .reduce((subtotal, line) => subtotal + line.quantity, 0),
        0,
      ),
    }))
    .filter((product) => product.quantity > 0)
    .sort((first, second) => second.quantity - first.quantity),
);
const customerRanking = computed(() =>
  state.value.customers
    .map((customer) => ({
      ...customer,
      total: sales.value
        .filter((sale) => sale.customerId === customer.id)
        .reduce((sum, sale) => sum + sale.total, 0),
    }))
    .filter((customer) => customer.total > 0)
    .sort((first, second) => second.total - first.total),
);
const groupedRevenue = (field: "brandId" | "categoryId", id: string) =>
  groupedMerchandise(reportOrders.value, field, id);
function exportReport() {
  const rows = [
    "Venda;Cliente;Data;Pagamento;Total",
    ...sales.value.map((sale) =>
      [
        sale.number,
        customerName(sale.customerId),
        formatDate(sale.date),
        sale.paymentMethod,
        sale.total.toFixed(2).replace(".", ","),
      ]
        .map(csvCell)
        .join(";"),
    ),
  ];
  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "vendas-" + selectedMonth.value + ".csv";
  anchor.click();
  URL.revokeObjectURL(url);
  notify("Relatório exportado.");
}
</script>
<template>
  <div>
    <div class="page-heading">
      <div>
        <div class="eyebrow">DECISÕES COM MAIS CLAREZA</div>
        <h1>Relatórios</h1>
        <p>Transforme seus números em próximos passos.</p>
      </div>
      <div class="flex gap-3">
        <input
          v-model="selectedMonth"
          type="month"
          aria-label="Mês do relatório"
          class="max-w-44"
        /><button class="button secondary" @click="exportReport">
          <Icon name="download" :size="16" />Exportar CSV
        </button>
      </div>
    </div>
    <ApiPeriodReport v-if="!demo" :month="selectedMonth" detailed />
    <template v-if="demo">
      <div class="metric-grid">
        <MetricCard
          label="Faturamento mensal"
          :amount="money(revenue)"
          icon="finance"
          accent
        /><MetricCard
          label="Lucro estimado"
          :amount="money(profit)"
          icon="reports"
        /><MetricCard
          label="Número de vendas"
          :amount="sales.length"
          icon="sales"
        /><MetricCard
          label="Ticket médio"
          :amount="money(sales.length ? revenue / sales.length : 0)"
          icon="cart"
        />
      </div>
      <p v-if="unknownCosts" role="status" class="muted">
        Há pedidos antigos sem custo conhecido. O lucro exibido é parcial.
      </p>
      <p class="muted">
        Frete contratado: {{ money(shippingRevenue) }} · Juros contratados:
        {{ money(interestRevenue) }}. Estes valores não compõem o lucro de
        mercadorias. Caixa recebido está no Financeiro.
      </p>
      <div class="equal-columns">
        <section class="panel">
          <div class="panel-header">
            <h2>Faturamento dos últimos seis meses</h2>
          </div>
          <SalesChart />
        </section>
        <section class="panel">
          <div class="panel-header"><h2>Vendas por marca</h2></div>
          <div class="panel-body">
            <div v-for="brand in brands" :key="brand.id" class="brand-row">
              <p>{{ brand.name }}</p>
              <div class="brand-bar">
                <span
                  :style="{
                    width:
                      (revenue
                        ? (groupedRevenue('brandId', brand.id) / revenue) * 100
                        : 0) + '%',
                    background: brand.color,
                  }"
                />
              </div>
              <strong>{{ money(groupedRevenue("brandId", brand.id)) }}</strong>
            </div>
          </div>
        </section>
      </div>
      <div class="equal-columns">
        <section class="panel">
          <div class="panel-header"><h2>Produtos mais vendidos</h2></div>
          <div class="panel-body">
            <div
              v-for="(product, index) in productRanking.slice(0, 6)"
              :key="product.id"
              class="mini-list"
            >
              <span class="text-xs text-gray-400">{{ index + 1 }}</span>
              <div>
                <strong>{{ product.name }}</strong
                ><small>{{ brandName(product.brandId) }}</small>
              </div>
              <strong class="list-right">{{ product.quantity }} un.</strong>
            </div>
            <EmptyState
              v-if="!productRanking.length"
              title="Nenhuma venda neste período"
            />
          </div>
        </section>
        <section class="panel">
          <div class="panel-header"><h2>Clientes que mais compraram</h2></div>
          <div class="panel-body">
            <div
              v-for="(customer, index) in customerRanking.slice(0, 6)"
              :key="customer.id"
              class="mini-list"
            >
              <span class="customer-avatar">{{ index + 1 }}</span
              ><strong>{{ customer.name }}</strong
              ><strong class="list-right">{{ money(customer.total) }}</strong>
            </div>
            <EmptyState
              v-if="!customerRanking.length"
              title="Nenhuma venda neste período"
            />
          </div>
        </section>
      </div>
      <div class="equal-columns">
        <section class="panel">
          <div class="panel-header"><h2>Vendas por categoria</h2></div>
          <div class="panel-body">
            <div
              v-for="category in categories"
              :key="category.id"
              class="brand-row"
            >
              <p class="!min-w-28">{{ category.name }}</p>
              <div class="brand-bar">
                <span
                  :style="{
                    width:
                      (revenue
                        ? (groupedRevenue('categoryId', category.id) /
                            revenue) *
                          100
                        : 0) + '%',
                    background: '#94aa8d',
                  }"
                />
              </div>
              <strong>{{
                money(groupedRevenue("categoryId", category.id))
              }}</strong>
            </div>
          </div>
        </section>
        <section class="panel">
          <div class="panel-header">
            <div>
              <h2>Saúde dos recebimentos</h2>
              <p>Posição atual • independente do mês selecionado</p>
            </div>
          </div>
          <div class="panel-body">
            <div class="cart-total">
              <span class="text-sm">Contas a receber</span
              ><span>{{ money(receivable) }}</span>
            </div>
            <div class="mini-list">
              <div>
                <strong>Parcelas vencidas</strong
                ><small
                  >{{ overdue.length }} parcelas precisam de atenção</small
                >
              </div>
              <strong class="list-right">{{
                money(overdue.reduce((sum, portion) => sum + portion.amount, 0))
              }}</strong>
            </div>
            <NuxtLink to="/admin/financeiro" class="button secondary mt-6"
              >Acompanhar financeiro <Icon name="arrow" :size="15"
            /></NuxtLink>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  upcomingInstallments,
  birthdayCustomers,
} from "~/utils/commerce/settings";
import { groupedMerchandise } from "~/utils/commerce/reports";
import { money, formatDate, today, installmentStatus } from "~/utils/domain";
const { demo } = useStoreMode();
const {
  state,
  settings,
  brands,
  revenue,
  profit,
  monthSales,
  receivable,
  overdue,
  lowStock,
  customerName,
  productName,
  brandName,
  openInstallments,
} = useBusiness();
const incompleteCost = computed(() =>
  state.value.orders.some(
    (o) =>
      o.accountedAt &&
      o.status !== "Cancelado" &&
      o.date.startsWith(today().slice(0, 7)) &&
      o.items.some((i) => i.costPrice == null),
  ),
);
const average = computed(() =>
  monthSales.value.length ? revenue.value / monthSales.value.length : 0,
);
const brandSales = computed(() =>
  brands.value.map((brand) => ({
    ...brand,
    total: groupedMerchandise(
      state.value.orders.filter((o) => o.date.startsWith(today().slice(0, 7))),
      "brandId",
      brand.id,
    ),
  })),
);
const topProducts = computed(() =>
  state.value.products
    .map((product) => ({
      ...product,
      quantity: state.value.sales.reduce(
        (sum, sale) =>
          sum +
          sale.items
            .filter((line) => line.productId === product.id)
            .reduce((subtotal, line) => subtotal + line.quantity, 0),
        0,
      ),
    }))
    .sort((first, second) => second.quantity - first.quantity)
    .slice(0, 4),
);
const upcoming = computed(() =>
  upcomingInstallments(
    openInstallments.value,
    today(),
    settings.value.alertDays,
  )
    .sort((first, second) => first.dueDate.localeCompare(second.dueDate))
    .slice(0, 3),
);
</script>
<template>
  <div>
    <div class="page-heading">
      <div>
        <div class="eyebrow">SEU NEGÓCIO, EM UM SÓ LUGAR</div>
        <h1>Olá, gestora <span class="text-sage-600">✦</span></h1>
        <p>Resumo das atividades do seu negócio.</p>
      </div>
      <div class="flex gap-3">
        <NuxtLink to="/admin/relatorios" class="button secondary"
          ><Icon name="reports" :size="16" />Ver relatórios</NuxtLink
        ><NuxtLink to="/admin/vendas?nova=1" class="button"
          ><Icon name="plus" :size="17" />Nova venda</NuxtLink
        >
      </div>
    </div>
    <p v-if="demo && incompleteCost" role="status">
      Lucro parcial: há itens legados sem custo conhecido.
    </p>
    <ApiPeriodReport v-if="!demo" :month="today().slice(0, 7)" />
    <section class="panel panel-body mb-6">
      <h2>
        Aniversariantes do mês ({{
          birthdayCustomers(state, today().slice(0, 7)).length
        }})
      </h2>
      <NuxtLink to="/admin/clientes" class="text-link"
        >Ver aniversários e benefícios</NuxtLink
      >
      <p
        v-for="customer in birthdayCustomers(state, today().slice(0, 7)).slice(
          0,
          5,
        )"
        :key="customer.id"
      >
        {{ customer.name }} · {{ formatDate(customer.birthday) }}
      </p>
    </section>
    <div v-if="demo" class="metric-grid">
      <MetricCard
        label="Faturamento do mês"
        :amount="money(revenue)"
        icon="finance"
        note="Vendas realizadas neste mês"
        accent
      /><MetricCard
        label="Pedidos no mês"
        :amount="
          state.orders.filter((order) =>
            order.date.startsWith(today().slice(0, 7)),
          ).length
        "
        icon="sales"
        note="Inclui pedidos novos e cancelados"
      /><MetricCard
        label="Lucro estimado"
        :amount="money(profit)"
        icon="reports"
        note="Receita menos custo dos produtos"
      /><MetricCard
        label="Ticket médio"
        :amount="money(average)"
        icon="cart"
        note="Valor médio por venda no mês"
      />
    </div>
    <div class="alert-grid">
      <NuxtLink to="/admin/financeiro" class="alert-card"
        ><Icon name="finance" />
        <div>
          <strong>{{ money(receivable) }}</strong>
          <p>Valores a receber</p>
        </div>
        <Icon class="arrow" name="right" :size="15" /></NuxtLink
      ><NuxtLink to="/admin/financeiro?status=Vencida" class="alert-card"
        ><Icon name="alert" />
        <div>
          <strong>{{ overdue.length }} parcelas</strong>
          <p>Vencidas • precisam de atenção</p>
        </div>
        <Icon class="arrow" name="right" :size="15" /></NuxtLink
      ><NuxtLink to="/admin/estoque" class="alert-card"
        ><Icon name="inventory" />
        <div>
          <strong>{{ lowStock.length }} produtos</strong>
          <p>Com estoque baixo ou zerado</p>
        </div>
        <Icon class="arrow" name="right" :size="15" /></NuxtLink
      ><NuxtLink to="/admin/pedidos" class="alert-card"
        ><Icon name="orders" />
        <div>
          <strong
            >{{
              state.orders.filter((order) => order.status === "Novo").length
            }}
            pedidos</strong
          >
          <p>Novos • aguardando confirmação</p>
        </div>
        <Icon class="arrow" name="right" :size="15"
      /></NuxtLink>
    </div>
    <div v-if="demo" class="two-columns">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>Evolução das vendas</h2>
            <p>Um olhar sobre os últimos seis meses</p>
          </div>
          <span class="chart-legend"><i />Faturamento</span>
        </div>
        <SalesChart />
      </section>
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>Vendas por marca</h2>
            <p>Participação no faturamento do mês</p>
          </div>
          <Icon name="reports" :size="18" class="text-sage-600" />
        </div>
        <div class="panel-body">
          <div v-for="brand in brandSales" :key="brand.id" class="brand-row">
            <p>{{ brand.name }}</p>
            <div class="brand-bar">
              <span
                :style="{
                  width: (revenue ? (brand.total / revenue) * 100 : 0) + '%',
                  background: brand.color,
                }"
              />
            </div>
            <strong>{{ money(brand.total) }}</strong>
          </div>
          <div class="flex justify-between mt-4 pt-3 border-t border-gray-100">
            <small>4 marcas que fazem parte da sua história</small
            ><Icon name="products" :size="16" class="text-sage-600" />
          </div>
        </div>
      </section>
    </div>
    <div class="two-columns">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>Pedidos recentes</h2>
            <p>Cada pedido, uma nova oportunidade</p>
          </div>
          <NuxtLink to="/admin/pedidos" class="text-link"
            >Ver todos <Icon name="right" :size="13"
          /></NuxtLink>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Pedido / cliente</th>
                <th>Data</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in state.orders.slice(0, 4)" :key="order.id">
                <td>
                  <NuxtLink :to="'/admin/pedidos?pedido=' + order.id"
                    ><strong>{{ customerName(order.customerId) }}</strong
                    ><small>{{ order.number }}</small></NuxtLink
                  >
                </td>
                <td>{{ formatDate(order.date) }}</td>
                <td>
                  <strong>{{ money(order.total) }}</strong>
                </td>
                <td><StatusBadge :status="order.status" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>Mais queridos pelas clientes</h2>
            <p>Produtos mais vendidos</p>
          </div>
          <Icon name="sparkles" :size="18" class="text-sage-600" />
        </div>
        <div class="panel-body">
          <div
            v-for="(product, index) in topProducts"
            :key="product.id"
            class="mini-list"
          >
            <span class="text-xs text-gray-400">0{{ index + 1 }}</span
            ><span class="product-thumbnail"
              ><Icon name="products" :size="20"
            /></span>
            <div>
              <strong>{{ product.name }}</strong
              ><small>{{ brandName(product.brandId) }}</small>
            </div>
            <div class="list-right">
              <strong>{{ product.quantity }}</strong
              ><small>vendidos</small>
            </div>
          </div>
        </div>
      </section>
    </div>
    <div class="equal-columns">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>Próximos vencimentos</h2>
            <p>Lembretes que ajudam a manter tudo em dia</p>
          </div>
          <NuxtLink to="/admin/financeiro" class="text-link"
            >Ver financeiro <Icon name="right" :size="13"
          /></NuxtLink>
        </div>
        <div class="panel-body">
          <div v-for="portion in upcoming" :key="portion.id" class="mini-list">
            <span class="customer-avatar">{{
              customerName(portion.customerId)
                .split(" ")
                .map((word) => word[0])
                .slice(0, 2)
                .join("")
            }}</span>
            <div>
              <strong>{{ customerName(portion.customerId) }}</strong
              ><small
                >Parcela {{ portion.number }}/{{ portion.count }} ·
                {{ formatDate(portion.dueDate) }}</small
              >
            </div>
            <div class="list-right">
              <strong>{{ money(portion.amount) }}</strong
              ><small>{{ installmentStatus(portion) }}</small>
            </div>
          </div>
          <EmptyState
            v-if="!upcoming.length"
            title="Tudo em dia por aqui"
            description="Nenhuma parcela próxima do vencimento."
          />
        </div>
      </section>
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>Atenção ao estoque</h2>
            <p>Hora de planejar sua próxima reposição</p>
          </div>
          <NuxtLink to="/admin/estoque" class="text-link"
            >Ver estoque <Icon name="right" :size="13"
          /></NuxtLink>
        </div>
        <div class="panel-body">
          <div
            v-for="product in lowStock.slice(0, 3)"
            :key="product.id"
            class="mini-list"
          >
            <span class="product-thumbnail"
              ><Icon name="products" :size="18"
            /></span>
            <div>
              <strong>{{ productName(product.id) }}</strong
              ><small>{{ brandName(product.brandId) }}</small>
            </div>
            <div class="list-right">
              <StatusBadge
                :status="product.stock ? 'Estoque baixo' : 'Sem estoque'"
              /><small>{{ product.stock }} unidades disponíveis</small>
            </div>
          </div>
        </div>
      </section>
    </div>
    <section class="panel" v-if="overdue.length">
      <div class="panel-header">
        <h2>Parcelas vencidas</h2>
        <NuxtLink to="/admin/financeiro?status=Vencida" class="text-link"
          >Acompanhar cobranças <Icon name="right" :size="13"
        /></NuxtLink>
      </div>
      <div class="panel-body flex flex-wrap gap-6">
        <div v-for="portion in overdue.slice(0, 3)" :key="portion.id">
          <strong class="text-xs">{{
            customerName(portion.customerId)
          }}</strong>
          <p class="text-xs">
            {{ money(portion.amount) }} · {{ formatDate(portion.dueDate) }}
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

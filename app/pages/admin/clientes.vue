<script setup lang="ts">
import type { Customer } from "~/types";
import { money, formatDate, installmentStatus, today } from "~/utils/domain";
const { customers } = useCustomers();
const { state, customerName } = useBusiness();
const route = useRoute();
const formBusy = ref(false);
const search = ref(""),
  formOpen = ref(false),
  selectedCustomer = ref<Customer>(),
  detailCustomer = ref<Customer>();
const filteredCustomers = computed(() =>
  customers.value.filter((customer) =>
    (customer.name + customer.phone)
      .toLowerCase()
      .includes(search.value.toLowerCase()),
  ),
);
const customerSales = (customerId: string) =>
  state.value.sales.filter((sale) => sale.customerId === customerId);
const customerPortions = (customerId: string) =>
  state.value.installments.filter(
    (portion) => portion.customerId === customerId,
  );
const totalSpent = (customerId: string) =>
  customerSales(customerId).reduce((sum, sale) => sum + sale.total, 0);
const birthdays = computed(() =>
  customers.value
    .filter((customer) => {
      if (!customer.birthday) return false;
      const date = new Date(today() + "T12:00:00");
      let birthday = new Date(
        date.getFullYear() + customer.birthday.slice(4) + "T12:00:00",
      );
      if (birthday < date) birthday.setFullYear(date.getFullYear() + 1);
      return (birthday.getTime() - date.getTime()) / 86400000 <= 30;
    })
    .sort((first, second) =>
      first.birthday.slice(5).localeCompare(second.birthday.slice(5)),
    ),
);
function openForm(customer?: Customer) {
  selectedCustomer.value = customer;
  formOpen.value = true;
}
onMounted(() => {
  if (route.query.cliente)
    detailCustomer.value = customers.value.find(
      (customer) => customer.id === route.query.cliente,
    );
});
const { page, pages, rows } = usePagination(filteredCustomers);
</script>
<template>
  <div>
    <div class="page-heading">
      <div>
        <div class="eyebrow">CLIENTES</div>
        <h1>Clientes</h1>
        <p>Conheça quem compra com você e cuide de cada relação.</p>
      </div>
      <button class="button" @click="openForm()">
        <Icon name="plus" :size="17" />Novo cliente
      </button>
    </div>
    <div class="metric-grid">
      <MetricCard
        label="Clientes cadastrados"
        :amount="customers.length"
        icon="customers"
      /><MetricCard
        label="Clientes com compras"
        :amount="new Set(state.sales.map((sale) => sale.customerId)).size"
        icon="sales"
      /><MetricCard
        label="Aniversariantes próximos"
        :amount="birthdays.length"
        icon="calendar"
        note="Nos próximos 30 dias"
      /><MetricCard
        label="Com parcelas abertas"
        :amount="
          new Set(
            state.installments
              .filter((portion) => !portion.paidAt)
              .map((portion) => portion.customerId),
          ).size
        "
        icon="finance"
      />
    </div>
    <CustomerRelationships />
    <section class="panel">
      <div class="toolbar">
        <div class="search-field">
          <Icon name="search" :size="17" /><input
            v-model="search"
            placeholder="Pesquisar por nome ou telefone..."
          />
        </div>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Telefone</th>
              <th>Total comprado</th>
              <th>Compras</th>
              <th>Abertas / vencidas</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="customer in rows" :key="customer.id">
              <td>
                <div class="product-cell">
                  <span class="customer-avatar">{{
                    customer.name
                      .split(" ")
                      .map((word) => word[0])
                      .slice(0, 2)
                      .join("")
                  }}</span
                  ><strong>{{ customer.name }}</strong>
                </div>
              </td>
              <td>{{ customer.phone }}</td>
              <td>{{ money(totalSpent(customer.id)) }}</td>
              <td>{{ customerSales(customer.id).length }}</td>
              <td>
                {{
                  customerPortions(customer.id).filter(
                    (portion) => !portion.paidAt,
                  ).length
                }}
                /
                {{
                  customerPortions(customer.id).filter(
                    (portion) => installmentStatus(portion) === "Vencida",
                  ).length
                }}
              </td>
              <td>
                <button
                  class="icon-button"
                  :aria-label="'Detalhes de ' + customer.name"
                  @click="detailCustomer = customer"
                >
                  <Icon name="eye" :size="17" /></button
                ><button
                  class="icon-button"
                  :aria-label="'Editar ' + customer.name"
                  @click="openForm(customer)"
                >
                  <Icon name="edit" :size="17" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <ListPagination v-model:page="page" :pages="pages" />
      </div>
      <EmptyState v-if="!filteredCustomers.length" />
      <div class="table-footer">
        {{ filteredCustomers.length }} clientes encontrados
      </div>
    </section>
    <section class="panel section-gap">
      <div class="panel-header">
        <h2>Próximos aniversários</h2>
        <Icon name="sparkles" :size="18" class="text-sage-600" />
      </div>
      <div class="panel-body">
        <div
          v-for="customer in birthdays"
          :key="customer.id"
          class="birthday-row"
        >
          <strong>{{ customer.name }}</strong
          ><span
            >{{ customer.birthday.slice(8) }}/{{
              customer.birthday.slice(5, 7)
            }}</span
          >
        </div>
        <EmptyState
          v-if="!birthdays.length"
          title="Nenhum aniversário próximo"
          description="Os aniversários dos próximos 30 dias aparecem aqui."
        />
      </div>
    </section>
    <Modal
      v-if="formOpen"
      :busy="formBusy"
      :title="selectedCustomer ? 'Editar cliente' : 'Novo cliente'"
      @close="formOpen = false"
      ><CustomerForm
        @busy="formBusy = $event"
        :customer="selectedCustomer"
        @saved="formOpen = false"
        @close="formOpen = false" /></Modal
    ><Modal
      v-if="detailCustomer"
      :title="customerName(detailCustomer.id)"
      wide
      @close="detailCustomer = undefined"
      ><p>
        {{ detailCustomer.phone }} · Nascimento:
        {{
          detailCustomer.birthday
            ? formatDate(detailCustomer.birthday)
            : "Não informado"
        }}
        · Cliente desde {{ formatDate(detailCustomer.createdAt) }}
      </p>
      <div class="detail-summary">
        <div>
          <small>Total comprado</small
          ><strong>{{ money(totalSpent(detailCustomer.id)) }}</strong>
        </div>
        <div>
          <small>Compras</small
          ><strong>{{ customerSales(detailCustomer.id).length }}</strong>
        </div>
        <div>
          <small>Parcelas vencidas</small
          ><strong>{{
            customerPortions(detailCustomer.id).filter(
              (portion) => installmentStatus(portion) === "Vencida",
            ).length
          }}</strong>
        </div>
      </div>
      <h3>Histórico de compras</h3>
      <div
        v-for="sale in customerSales(detailCustomer.id)"
        :key="sale.id"
        class="mini-list"
      >
        <NuxtLink :to="'/admin/vendas?venda=' + sale.id"
          ><strong>{{ sale.number }}</strong
          ><small
            >{{ formatDate(sale.date) }} · {{ sale.paymentMethod }}</small
          ></NuxtLink
        ><strong class="list-right">{{ money(sale.total) }}</strong>
      </div>
      <p v-if="!customerSales(detailCustomer.id).length" class="py-4 text-xs">
        Nenhuma compra registrada.
      </p>
      <h3 class="mt-6">Todas as parcelas</h3>
      <div
        v-for="portion in customerPortions(detailCustomer.id)"
        :key="portion.id"
        class="mini-list"
      >
        <div>
          <strong
            >{{ money(portion.amount) }} · {{ portion.number }}/{{
              portion.count
            }}</strong
          ><small>{{ formatDate(portion.dueDate) }}</small>
        </div>
        <div class="list-right">
          <StatusBadge :status="installmentStatus(portion)" />
        </div>
      </div>
      <p
        v-if="!customerPortions(detailCustomer.id).length"
        class="py-4 text-xs"
      >
        Nenhuma parcela registrada.
      </p></Modal
    >
  </div>
</template>

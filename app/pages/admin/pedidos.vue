<script setup lang="ts">
import type { Order, OrderStatus } from "~/types";
import { money, formatDate, whatsappLink } from "~/utils/domain";
const { isLoading, runWithLoading } = useLoading();
const route = useRoute();
const { state, customerName, productName, receiveOrder } = useBusiness();
const { changeOrderStatus } = useOrders();
const search = ref(""),
  filter = ref(""),
  selectedOrder = ref<Order>(),
  cancelOrderId = ref("");
const processingOrderId = ref("");
const statuses: OrderStatus[] = [
  "Novo",
  "Confirmado",
  "Em preparação",
  "Finalizado",
  "Cancelado",
];
const filteredOrders = computed(() =>
  state.value.orders.filter(
    (order) =>
      (!filter.value || order.status === filter.value) &&
      (order.number + customerName(order.customerId))
        .toLowerCase()
        .includes(search.value.toLowerCase()),
  ),
);
const phoneFor = (customerId: string) =>
  state.value.customers.find((customer) => customer.id === customerId)?.phone ||
  "";
async function updateStatus(orderId: string, status: string) {
  if (status === "Cancelado") cancelOrderId.value = orderId;
  else
    await runWithLoading(async () => {
      const result = await changeOrderStatus(orderId, status as OrderStatus);
      if (selectedOrder.value?.id === orderId) selectedOrder.value = result;
    });
}
onMounted(() => {
  if (route.query.pedido)
    selectedOrder.value = state.value.orders.find(
      (order) => order.id === route.query.pedido,
    );
});
async function confirmOrder(orderId: string) {
  if (isLoading.value) return;
  processingOrderId.value = orderId;
  try {
    await runWithLoading(
      async () => await changeOrderStatus(orderId, "Confirmado"),
    );
  } finally {
    processingOrderId.value = "";
  }
}
async function receivePayment() {
  if (!selectedOrder.value) return;
  await runWithLoading(async () => {
    selectedOrder.value = await receiveOrder(selectedOrder.value!.id);
  });
}
async function cancelOrder() {
  await runWithLoading(async () => {
    await changeOrderStatus(cancelOrderId.value, "Cancelado");
    cancelOrderId.value = "";
    selectedOrder.value = undefined;
  });
}
const { page, pages, rows } = usePagination(filteredOrders);
</script>
<template>
  <div>
    <div class="page-heading">
      <div>
        <div class="eyebrow">DO PRIMEIRO CONTATO À ENTREGA</div>
        <h1>Pedidos</h1>
        <p>Os pedidos da sua loja aparecem aqui, prontos para você cuidar.</p>
      </div>
      <NuxtLink to="/loja" class="button secondary"
        ><Icon name="external" :size="16" />Abrir catálogo</NuxtLink
      >
    </div>
    <div class="metric-grid">
      <MetricCard
        label="Novos pedidos"
        :amount="state.orders.filter((order) => order.status === 'Novo').length"
        icon="orders"
      /><MetricCard
        label="Em andamento"
        :amount="
          state.orders.filter((order) =>
            ['Confirmado', 'Em preparação'].includes(order.status),
          ).length
        "
        icon="inventory"
      /><MetricCard
        label="Finalizados"
        :amount="
          state.orders.filter((order) => order.status === 'Finalizado').length
        "
        icon="check"
      /><MetricCard
        label="Valor em andamento"
        :amount="
          money(
            state.orders
              .filter(
                (order) => !['Cancelado', 'Finalizado'].includes(order.status),
              )
              .reduce((sum, order) => sum + order.total, 0),
          )
        "
        icon="finance"
      />
    </div>
    <div class="info-message">
      <Icon name="leaf" :size="18" />Pedidos novos não reservam estoque.
      Confirmar gera a venda e baixa estoque uma única vez; o recebimento é
      registrado separadamente.
    </div>
    <section class="panel">
      <div class="toolbar">
        <div class="search-field">
          <Icon name="search" :size="17" /><input
            v-model="search"
            placeholder="Pesquisar pedido ou cliente..."
          />
        </div>
        <select v-model="filter" aria-label="Filtrar pedidos">
          <option value="">Todos os status</option>
          <option v-for="status in statuses" :key="status">{{ status }}</option>
        </select>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente / telefone</th>
              <th>Data</th>
              <th>Total</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in rows" :key="order.id">
              <td>
                <strong>{{ order.number }}</strong
                ><small
                  >{{
                    order.items.reduce((sum, line) => sum + line.quantity, 0)
                  }}
                  produtos</small
                >
              </td>
              <td>
                <strong>{{ customerName(order.customerId) }}</strong
                ><small>{{ phoneFor(order.customerId) }}</small>
              </td>
              <td>{{ formatDate(order.date) }}</td>
              <td>{{ money(order.total) }}</td>
              <td><StatusBadge :status="order.status" /></td>
              <td>
                <div class="flex gap-2 items-center">
                  <button
                    class="icon-button"
                    :aria-label="'Detalhes do pedido ' + order.number"
                    @click="selectedOrder = order"
                  >
                    <Icon name="eye" :size="17" /></button
                  ><LoadingButton
                    v-if="order.status === 'Novo'"
                    class="secondary small"
                    :loading="isLoading && processingOrderId === order.id"
                    :disabled="isLoading"
                    loading-text="Confirmando..."
                    @click="confirmOrder(order.id)"
                    >Confirmar</LoadingButton
                  ><a
                    class="icon-button"
                    :href="
                      whatsappLink(
                        phoneFor(order.customerId),
                        'Olá, ' +
                          customerName(order.customerId) +
                          '! Vamos conversar sobre seu pedido ' +
                          order.number +
                          '?',
                      )
                    "
                    target="_blank"
                    rel="noopener"
                    aria-label="Contatar pelo WhatsApp"
                    ><Icon name="phone" :size="17"
                  /></a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <ListPagination v-model:page="page" :pages="pages" />
      </div>
      <EmptyState v-if="!filteredOrders.length" />
    </section>
    <Modal
      v-if="selectedOrder"
      :busy="isLoading"
      :title="'Pedido ' + selectedOrder.number"
      wide
      @close="selectedOrder = undefined"
      ><p>
        {{ customerName(selectedOrder.customerId) }} ·
        {{ phoneFor(selectedOrder.customerId) }} ·
        {{ formatDate(selectedOrder.date) }}
      </p>
      <div
        v-for="line in selectedOrder.items"
        :key="line.productId"
        class="mini-list"
      >
        <div>
          <strong>{{ line.name || productName(line.productId) }}</strong
          ><small>{{ line.quantity }} un. × {{ money(line.unitPrice) }}</small>
        </div>
        <strong class="list-right">{{
          money(line.quantity * line.unitPrice)
        }}</strong>
      </div>
      <p>Pagamento: {{ selectedOrder.paymentStatus }}</p>
      <p v-if="selectedOrder.addressSnapshot">
        Entrega: {{ selectedOrder.addressSnapshot }}
      </p>
      <LoadingButton
        v-if="
          selectedOrder.accountedAt &&
          selectedOrder.paymentStatus !== 'Aprovado' &&
          !['Cartão', 'Parcelado'].includes(selectedOrder.paymentMethod || '')
        "
        :loading="isLoading"
        @click="receivePayment"
        >Confirmar recebimento conferido</LoadingButton
      >
      <p
        v-if="
          ['Cartão', 'Parcelado'].includes(selectedOrder.paymentMethod || '')
        "
      >
        Registre cada parcela no Financeiro, somente após conferir o
        recebimento.
      </p>
      <OrderSummary :order="selectedOrder" /><OrderHistory
        :order-id="selectedOrder.id"
      />
      <div class="cart-total">
        <span>Total</span><span>{{ money(selectedOrder.total) }}</span>
      </div>
      <p v-if="isLoading" role="status" class="loading-note">
        <Icon name="loading" :size="16" class="loading-spinner" />Atualizando
        pedido...
      </p>
      <label
        >Status do pedido<select
          :value="selectedOrder.status"
          :disabled="
            isLoading ||
            ['Cancelado', 'Finalizado'].includes(selectedOrder.status)
          "
          @change="
            updateStatus(
              selectedOrder.id,
              ($event.target as HTMLSelectElement).value,
            )
          "
        >
          <option v-for="status in statuses" :key="status">{{ status }}</option>
        </select></label
      >
      <div class="form-actions">
        <button
          v-if="!['Cancelado', 'Finalizado'].includes(selectedOrder.status)"
          :disabled="isLoading"
          class="button danger"
          @click="cancelOrderId = selectedOrder.id"
        >
          Cancelar pedido</button
        ><button
          :disabled="isLoading"
          class="button secondary"
          @click="selectedOrder = undefined"
        >
          Fechar
        </button>
      </div></Modal
    ><Modal
      v-if="cancelOrderId"
      :busy="isLoading"
      title="Cancelar pedido?"
      @close="cancelOrderId = ''"
      ><p>
        O pedido será marcado como cancelado. Os registros permanecerão no
        histórico.
      </p>
      <div class="form-actions">
        <button
          :disabled="isLoading"
          class="button secondary"
          @click="cancelOrderId = ''"
        >
          Manter pedido</button
        ><LoadingButton
          class="danger"
          :loading="isLoading"
          loading-text="Cancelando pedido..."
          @click="cancelOrder"
          >Confirmar cancelamento</LoadingButton
        >
      </div></Modal
    >
  </div>
</template>

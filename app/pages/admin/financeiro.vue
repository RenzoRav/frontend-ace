<script setup lang="ts">
import {
  monthlyReceivable,
  upcomingInstallments,
} from "~/utils/commerce/settings";
import { money, today, formatDate, installmentStatus } from "~/utils/domain";
const { isLoading, runWithLoading } = useLoading();
const route = useRoute();
const { state, settings, customerName, receivable, overdue } = useBusiness();
const { payInstallment, billingLink } = useInstallments();
const filter = ref(
    typeof route.query.status === "string" ? route.query.status : "",
  ),
  search = ref(""),
  pendingPayment = ref("");
const sumPortions = (
  predicate: (portion: (typeof state.value.installments)[number]) => boolean,
) =>
  state.value.installments
    .filter(predicate)
    .reduce((sum, portion) => sum + portion.amount, 0);

const filteredInstallments = computed(() =>
  state.value.installments
    .filter(
      (portion) =>
        (!filter.value || installmentStatus(portion) === filter.value) &&
        customerName(portion.customerId)
          .toLowerCase()
          .includes(search.value.toLowerCase()),
    )
    .sort((first, second) => first.dueDate.localeCompare(second.dueDate)),
);
const saleNumber = (saleId: string) =>
  state.value.sales.find((sale) => sale.id === saleId)?.number;
async function confirmPayment() {
  await runWithLoading(async () => {
    await payInstallment(pendingPayment.value);
    pendingPayment.value = "";
  });
}
const { page, pages, rows } = usePagination(filteredInstallments);
</script>
<template>
  <div>
    <div class="page-heading">
      <div>
        <div class="eyebrow">FINANÇAS COM TRANQUILIDADE</div>
        <h1>Contas a receber</h1>
        <p>Um acompanhamento simples para manter seus recebimentos em dia.</p>
      </div>
    </div>
    <div class="metric-grid">
      <MetricCard
        label="Total a receber"
        :amount="money(receivable)"
        icon="finance"
        accent
      /><MetricCard
        label="Vencendo hoje"
        :amount="
          money(
            sumPortions(
              (portion) =>
                !portion.paidAt &&
                !portion.cancelledAt &&
                portion.dueDate === today(),
            ),
          )
        "
        icon="calendar"
      /><MetricCard
        :label="'Próximos ' + settings.alertDays + ' dias'"
        :amount="
          money(
            upcomingInstallments(
              state.installments,
              today(),
              settings.alertDays,
            ).reduce((sum, portion) => sum + portion.amount, 0),
          )
        "
        icon="orders"
      /><MetricCard
        label="Parcelas vencidas"
        :amount="
          money(overdue.reduce((sum, portion) => sum + portion.amount, 0))
        "
        icon="alert"
      />
    </div>
    <MetricCard
      label="A receber no mês"
      :amount="
        money(monthlyReceivable(state.installments, today().slice(0, 7)))
      "
      icon="calendar"
    />
    <div class="info-message">
      <Icon name="check" :size="18" />Recebidas no mês:
      <strong>{{
        money(
          sumPortions((portion) =>
            Boolean(
              portion.paidAt &&
              portion.paidAt.slice(0, 7) === today().slice(0, 7),
            ),
          ),
        )
      }}</strong
      ><span class="text-xs">• Recebimentos de parcelas</span>
    </div>
    <section class="panel">
      <div class="panel-header">
        <h2>Parcelas e recebimentos</h2>
        <small>{{ filteredInstallments.length }} parcelas</small>
      </div>
      <div class="toolbar">
        <div class="search-field">
          <Icon name="search" :size="17" /><input
            v-model="search"
            placeholder="Pesquisar cliente..."
          />
        </div>
        <select v-model="filter" aria-label="Filtrar status">
          <option value="">Todos os status</option>
          <option>Paga</option>
          <option>Em aberto</option>
          <option>Vencida</option>
        </select>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Venda</th>
              <th>Parcela</th>
              <th>Valor</th>
              <th>Vencimento</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="portion in rows" :key="portion.id">
              <td>
                <NuxtLink
                  :to="'/admin/clientes?cliente=' + portion.customerId"
                  class="text-link"
                  >{{ customerName(portion.customerId) }}</NuxtLink
                >
              </td>
              <td>
                <NuxtLink
                  :to="'/admin/vendas?venda=' + portion.saleId"
                  class="text-link"
                  >{{ saleNumber(portion.saleId) }}</NuxtLink
                >
              </td>
              <td>{{ portion.number }}/{{ portion.count }}</td>
              <td>
                <strong>{{ money(portion.amount) }}</strong>
              </td>
              <td>{{ formatDate(portion.dueDate) }}</td>
              <td><StatusBadge :status="installmentStatus(portion)" /></td>
              <td>
                <div class="flex gap-2">
                  <button
                    v-if="!portion.paidAt && !portion.cancelledAt"
                    class="button secondary small"
                    @click="pendingPayment = portion.id"
                  >
                    <Icon name="check" :size="13" />Marcar como paga</button
                  ><a
                    v-if="!portion.paidAt && !portion.cancelledAt"
                    :href="billingLink(portion.id)"
                    target="_blank"
                    rel="noopener"
                    class="icon-button"
                    :aria-label="
                      'Cobrar ' +
                      customerName(portion.customerId) +
                      ' pelo WhatsApp'
                    "
                    ><Icon name="phone" :size="17" /></a
                  ><span v-else class="text-xs text-gray-400">{{
                    portion.paidAt
                      ? "Recebida em " + formatDate(portion.paidAt)
                      : "Cancelada"
                  }}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <ListPagination v-model:page="page" :pages="pages" />
      </div>
      <EmptyState v-if="!filteredInstallments.length" />
    </section>
    <FinancialLedger /><BillingHistory /><Modal
      v-if="pendingPayment"
      :busy="isLoading"
      title="Confirmar recebimento"
      @close="pendingPayment = ''"
      ><p>
        A parcela foi recebida? A confirmação atualiza seus indicadores
        financeiros.
      </p>
      <div class="form-actions">
        <button
          :disabled="isLoading"
          class="button secondary"
          @click="pendingPayment = ''"
        >
          Voltar</button
        ><LoadingButton
          :loading="isLoading"
          loading-text="Registrando pagamento..."
          @click="confirmPayment"
          >Confirmar pagamento</LoadingButton
        >
      </div></Modal
    >
  </div>
</template>

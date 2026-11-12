<script setup lang="ts">
import type { CartLine, Sale, PaymentMethod, Quote } from "~/types";
import {
  money,
  formatDate,
  today,
  splitInstallments,
  addMonths,
} from "~/utils/domain";
import { paymentToApi } from "~/utils/api/adapters";
const { isLoading, runWithLoading } = useLoading();
const { demo } = useStoreMode();
const route = useRoute();
const { state, customerName, productName, monthSales, revenue, profit } =
  useBusiness();
const { quote } = useBusiness();
const couponCode = ref("");
const { finishSale } = useSales();
const formOpen = ref(false),
  selectedSale = ref<Sale>(),
  search = ref(""),
  productSearch = ref(""),
  error = ref("");
const selectedCustomer = ref(""),
  paymentMethod = ref<PaymentMethod>("PIX"),
  installmentCount = ref(3),
  firstDueDate = ref(demo ? today() : addMonths(today(), 1)),
  cart = ref<CartLine[]>([]);
const filteredSales = computed(() =>
  state.value.sales.filter((sale) =>
    (sale.number + customerName(sale.customerId))
      .toLowerCase()
      .includes(search.value.toLowerCase()),
  ),
);
const availableProducts = computed(() =>
  state.value.products.filter(
    (product) =>
      product.status === "active" &&
      product.stock > 0 &&
      product.name.toLowerCase().includes(productSearch.value.toLowerCase()),
  ),
);
const productFor = (productId: string) =>
  state.value.products.find((product) => product.id === productId)!;
const demoPreview = computed(() => {
  try {
    return quote({
      lines: cart.value,
      paymentMethod: paymentMethod.value,
      installmentCount: installmentCount.value,
      firstDueDate: firstDueDate.value,
      couponCode: couponCode.value,
    });
  } catch {
    return null;
  }
});
const apiPreview = ref<Quote | null>(null);
const api = useNuxtApp().$api;
let quoteGeneration = 0;
watch(
  [cart, paymentMethod, installmentCount, couponCode],
  async () => {
    if (demo) return;
    const generation = ++quoteGeneration;
    apiPreview.value = null;
    if (!cart.value.length) return;
    try {
      const result = await api.request<Quote & { installments: number[] }>(
        "/checkout/quote",
        {
          method: "POST",
          body: JSON.stringify({
            items: cart.value,
            paymentMethod: paymentToApi[paymentMethod.value],
            installmentCount: ["Cartão", "Parcelado"].includes(
              paymentMethod.value,
            )
              ? installmentCount.value
              : 1,
            delivery: false,
            couponCode: couponCode.value,
          }),
        },
      );
      if (generation === quoteGeneration)
        apiPreview.value = {
          ...result,
          schedule: result.installments.map((amount, index) => ({
            amount,
            dueDate: addMonths(today(), index + 1),
          })),
        };
    } catch (problem) {
      if (generation === quoteGeneration)
        error.value = (problem as Error).message;
    }
  },
  { deep: true },
);
const salePreview = computed(() =>
  demo ? demoPreview.value : apiPreview.value,
);
const total = computed(() => salePreview.value?.total || 0);
const schedule = computed(() => salePreview.value?.schedule || []);
function addProduct(productId: string) {
  const product = productFor(productId);
  const line = cart.value.find((line) => line.productId === productId);
  if (line) {
    if (line.quantity >= product.stock) {
      error.value = "Quantidade máxima em estoque atingida.";
      return;
    }
    line.quantity++;
  } else cart.value.push({ productId, quantity: 1 });
  error.value = "";
}
function openSale() {
  cart.value = [];
  selectedCustomer.value = "";
  error.value = "";
  formOpen.value = true;
}
async function submit() {
  if (isLoading.value) return;
  error.value = "";
  await runWithLoading(async () => {
    try {
      const sale = await finishSale(
        selectedCustomer.value,
        cart.value,
        paymentMethod.value,
        installmentCount.value,
        firstDueDate.value,
        couponCode.value,
      );
      formOpen.value = false;
      selectedSale.value = sale;
    } catch (problem) {
      error.value = (problem as Error).message;
    }
  });
}
onMounted(() => {
  if (route.query.nova) openSale();
  if (route.query.venda)
    selectedSale.value = state.value.sales.find(
      (sale) => sale.id === route.query.venda,
    );
});
</script>
<template>
  <div>
    <div class="page-heading">
      <div>
        <div class="eyebrow">CADA VENDA FAZ SEU NEGÓCIO CRESCER</div>
        <h1>Vendas</h1>
        <p>Registre vendas, acompanhe resultados e facilite os pagamentos.</p>
      </div>
      <button class="button" @click="openSale">
        <Icon name="plus" :size="17" />Nova venda
      </button>
    </div>
    <ApiPeriodReport v-if="!demo" :month="today().slice(0, 7)" />
    <div v-if="demo" class="metric-grid">
      <MetricCard
        label="Faturamento do mês"
        :amount="money(revenue)"
        icon="finance"
        accent
      /><MetricCard
        label="Vendas no mês"
        :amount="monthSales.length"
        icon="sales"
      /><MetricCard
        label="Lucro estimado"
        :amount="money(profit)"
        icon="reports"
      /><MetricCard
        label="Histórico de vendas"
        :amount="state.sales.length"
        icon="orders"
      />
    </div>
    <section class="panel">
      <div class="panel-header"><h2>Histórico de vendas</h2></div>
      <div class="toolbar">
        <div class="search-field">
          <Icon name="search" :size="17" /><input
            v-model="search"
            placeholder="Pesquisar venda ou cliente..."
          />
        </div>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Venda</th>
              <th>Cliente</th>
              <th>Data</th>
              <th>Pagamento</th>
              <th>Total</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sale in filteredSales" :key="sale.id">
              <td>
                <strong>{{ sale.number }}</strong>
              </td>
              <td>{{ customerName(sale.customerId) }}</td>
              <td>{{ formatDate(sale.date) }}</td>
              <td>
                <span class="brand-pill">{{ sale.paymentMethod }}</span>
              </td>
              <td>
                <strong>{{ money(sale.total) }}</strong>
              </td>
              <td>
                <button
                  class="icon-button"
                  :aria-label="'Visualizar ' + sale.number"
                  @click="selectedSale = sale"
                >
                  <Icon name="eye" :size="17" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <EmptyState v-if="!filteredSales.length" />
    </section>
    <Modal
      v-if="formOpen"
      :busy="isLoading"
      title="Nova venda"
      wide
      @close="formOpen = false"
      ><form @submit.prevent="submit" :aria-busy="isLoading">
        <fieldset class="loading-fieldset" :disabled="isLoading">
          <label
            >Cliente<select
              v-model="selectedCustomer"
              aria-label="Cliente"
              required
            >
              <option value="" disabled>Selecione um cliente</option>
              <option
                v-for="customer in state.customers"
                :key="customer.id"
                :value="customer.id"
              >
                {{ customer.name }}
              </option>
            </select></label
          >
          <div class="search-field mt-5">
            <Icon name="search" :size="17" /><input
              v-model="productSearch"
              placeholder="Pesquisar produtos para adicionar..."
            />
          </div>
          <div
            class="mt-3 max-h-40 overflow-auto border border-gray-100 rounded-lg"
          >
            <div
              v-for="product in availableProducts"
              :key="product.id"
              class="flex justify-between items-center gap-3 px-3 py-2 border-b border-gray-100"
            >
              <div>
                <strong class="text-xs">{{ product.name }}</strong
                ><small class="block"
                  >{{ money(product.salePrice) }} ·
                  {{ product.stock }} un.</small
                >
              </div>
              <button
                type="button"
                class="button secondary small"
                :aria-label="'Adicionar ' + product.name"
                @click="addProduct(product.id)"
              >
                <Icon name="plus" :size="14" />Adicionar
              </button>
            </div>
            <p v-if="!availableProducts.length" class="p-4 text-xs">
              Nenhum produto disponível.
            </p>
          </div>
          <h3 class="mt-6">Produtos da venda</h3>
          <div
            v-for="(line, index) in cart"
            :key="line.productId"
            class="cart-line"
          >
            <div class="line-name">
              <strong>{{ productName(line.productId) }}</strong
              ><small class="block"
                >{{ money(productFor(line.productId).salePrice) }} / un.</small
              >
            </div>
            <input
              v-model.number="line.quantity"
              type="number"
              min="1"
              :max="productFor(line.productId).stock"
              step="1"
              :aria-label="'Quantidade de ' + productName(line.productId)"
              required
            /><strong>{{
              money(productFor(line.productId).salePrice * line.quantity)
            }}</strong
            ><button
              type="button"
              class="icon-button"
              aria-label="Remover produto"
              @click="cart.splice(index, 1)"
            >
              <Icon name="trash" :size="16" />
            </button>
          </div>
          <p v-if="!cart.length" class="py-4 text-xs">
            Adicione produtos para começar.
          </p>
          <div class="cart-total">
            <span>Total da venda</span><span>{{ money(total) }}</span>
          </div>
          <div class="form-grid">
            <label
              :class="{
                full: !['Parcelado', 'Cartão'].includes(paymentMethod),
              }"
              >Forma de pagamento<select v-model="paymentMethod">
                <option>Dinheiro</option>
                <option>PIX</option>
                <option>Boleto</option>
                <option>Cartão</option>
                <option>Parcelado</option>
              </select></label
            ><label v-if="['Parcelado', 'Cartão'].includes(paymentMethod)"
              >Quantidade de parcelas<input
                v-model.number="installmentCount"
                type="number"
                min="1"
                max="12"
                step="1"
                required /></label
            ><label
              v-if="['Parcelado', 'Cartão'].includes(paymentMethod)"
              class="full"
              >Primeiro vencimento (API: um mês após confirmação)<input
                v-model="firstDueDate"
                :disabled="!demo"
                type="date"
                :min="today()"
                required
            /></label>
          </div>
          <div v-if="schedule.length" class="mt-4 rounded-lg bg-sage-50 p-3">
            <div
              v-for="(portion, index) in schedule"
              :key="index"
              class="flex justify-between py-1 text-xs"
            >
              <span
                >Parcela {{ index + 1 }} ·
                {{ formatDate(portion.dueDate) }}</span
              ><strong>{{ money(portion.amount) }}</strong>
            </div>
          </div>
          <p v-if="error" class="error-message" role="alert">{{ error }}</p>
          <label>Cupom da venda (opcional)<input v-model="couponCode" /></label
          ><OrderSummary v-if="salePreview" :order="salePreview" />
          <div class="form-actions">
            <button
              type="button"
              class="button secondary"
              @click="formOpen = false"
            >
              Cancelar</button
            ><LoadingButton
              :loading="isLoading"
              loading-text="Finalizando venda..."
              type="submit"
              :disabled="!cart.length"
              >Finalizar venda</LoadingButton
            >
          </div>
        </fieldset>
      </form></Modal
    ><Modal
      v-if="selectedSale"
      :title="'Venda ' + selectedSale.number"
      wide
      @close="selectedSale = undefined"
      ><SaleDetails :sale="selectedSale"
    /></Modal>
  </div>
</template>

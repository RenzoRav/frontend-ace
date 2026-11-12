<script setup lang="ts">
import { stockStatus, formatDate, money } from "~/utils/domain";
const { isLoading, runWithLoading } = useLoading();
const { state, brandName, productName, lowStock } = useBusiness();
const { moveStock } = useInventory();
const search = ref(""),
  filter = ref(""),
  formOpen = ref(false),
  error = ref("");
const movement = reactive({
  productId: "",
  type: "Entrada" as "Entrada" | "Saída" | "Ajuste",
  quantity: 1,
  reason: "",
});
const filteredProducts = computed(() =>
  state.value.products.filter(
    (product) =>
      (product.name + product.sku)
        .toLowerCase()
        .includes(search.value.toLowerCase()) &&
      (!filter.value || stockStatus(product) === filter.value),
  ),
);
async function submit() {
  if (isLoading.value) return;
  error.value = "";
  await runWithLoading(async () => {
    try {
      await moveStock(
        movement.productId,
        movement.type,
        movement.quantity,
        movement.reason,
      );
      formOpen.value = false;
    } catch (problem) {
      error.value = (problem as Error).message;
    }
  });
}
function openMovement(productId = "") {
  movement.productId = productId;
  movement.quantity = 1;
  movement.reason = "";
  error.value = "";
  formOpen.value = true;
}
</script>
<template>
  <div>
    <div class="page-heading">
      <div>
        <div class="eyebrow">TUDO NO LUGAR CERTO</div>
        <h1>Estoque</h1>
        <p>Acompanhe suas unidades e planeje a próxima reposição.</p>
      </div>
      <button class="button" @click="openMovement()">
        <Icon name="plus" :size="17" />Registrar movimentação
      </button>
    </div>
    <div class="metric-grid">
      <MetricCard
        label="Unidades em estoque"
        :amount="
          state.products.reduce((sum, product) => sum + product.stock, 0)
        "
        icon="inventory"
      /><MetricCard
        label="Estoque baixo"
        :amount="lowStock.filter((product) => product.stock > 0).length"
        icon="alert"
      /><MetricCard
        label="Sem estoque"
        :amount="state.products.filter((product) => !product.stock).length"
        icon="products"
      /><MetricCard
        label="Investimento em estoque"
        :amount="
          money(
            state.products.reduce(
              (sum, product) => sum + product.costPrice * product.stock,
              0,
            ),
          )
        "
        icon="finance"
      />
    </div>
    <section class="panel">
      <div class="toolbar">
        <div class="search-field">
          <Icon name="search" :size="17" /><input
            v-model="search"
            placeholder="Pesquisar produto ou SKU..."
          />
        </div>
        <select v-model="filter" aria-label="Status de estoque">
          <option value="">Todos os status</option>
          <option>Em estoque</option>
          <option>Estoque baixo</option>
          <option>Sem estoque</option>
        </select>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Produto / SKU</th>
              <th>Marca</th>
              <th>Estoque atual</th>
              <th>Mínimo</th>
              <th>Status</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="product in filteredProducts" :key="product.id">
              <td>
                <strong>{{ product.name }}</strong
                ><small>{{ product.sku }}</small>
              </td>
              <td>{{ brandName(product.brandId) }}</td>
              <td>
                <strong>{{ product.stock }} un.</strong>
              </td>
              <td>{{ product.minimumStock }} un.</td>
              <td><StatusBadge :status="stockStatus(product)" /></td>
              <td>
                <button
                  class="button secondary small"
                  @click="openMovement(product.id)"
                >
                  Movimentar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <EmptyState v-if="!filteredProducts.length" />
    </section>
    <section class="panel section-gap">
      <div class="panel-header">
        <div>
          <h2>Histórico de movimentações</h2>
          <p>
            Ajuste define o estoque final; entradas e saídas alteram o saldo.
          </p>
        </div>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Tipo</th>
              <th>Quantidade</th>
              <th>Data</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="movementEntry in state.movements"
              :key="movementEntry.id"
            >
              <td>{{ productName(movementEntry.productId) }}</td>
              <td>{{ movementEntry.type }}</td>
              <td>{{ movementEntry.quantity }}</td>
              <td>{{ formatDate(movementEntry.date) }}</td>
              <td>{{ movementEntry.reason || "—" }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <Modal
      v-if="formOpen"
      :busy="isLoading"
      title="Registrar movimentação"
      @close="formOpen = false"
      ><form @submit.prevent="submit" :aria-busy="isLoading">
        <fieldset class="loading-fieldset" :disabled="isLoading">
          <div class="form-grid">
            <label class="full"
              >Produto<select
                v-model="movement.productId"
                aria-label="Produto"
                required
              >
                <option value="" disabled>Selecione um produto</option>
                <option
                  v-for="product in state.products"
                  :key="product.id"
                  :value="product.id"
                >
                  {{ product.name }} ({{ product.stock }} un.)
                </option>
              </select></label
            ><label
              >Tipo<select v-model="movement.type" aria-label="Tipo">
                <option>Entrada</option>
                <option>Saída</option>
                <option>Ajuste</option>
              </select></label
            ><label
              >{{ movement.type === "Ajuste" ? "Estoque final" : "Quantidade"
              }}<input
                v-model.number="movement.quantity"
                type="number"
                :min="movement.type === 'Ajuste' ? 0 : 1"
                step="1"
                required /></label
            ><label class="full"
              >Motivo<input
                v-model="movement.reason"
                placeholder="Ex.: reposição, avaria ou contagem"
            /></label>
          </div>
          <p v-if="error" class="error-message">{{ error }}</p>
          <div class="form-actions">
            <button
              type="button"
              class="button secondary"
              @click="formOpen = false"
            >
              Cancelar</button
            ><LoadingButton
              :loading="isLoading"
              loading-text="Atualizando estoque..."
              type="submit"
              >Registrar</LoadingButton
            >
          </div>
        </fieldset>
      </form></Modal
    >
  </div>
</template>

<script setup lang="ts">
import type { Product } from "~/types";
import { money, stockStatus } from "~/utils/domain";
const { products } = useProducts();
const { demo } = useStoreMode();
const { removeProduct } = useBusiness();
const pendingRemoval = ref<Product>();
const removalError = ref("");
const { isLoading: removing, runWithLoading: runRemoval } = useLoading();
async function confirmRemoval() {
  if (!pendingRemoval.value) return;
  removalError.value = "";
  await runRemoval(async () => {
    try {
      await removeProduct(pendingRemoval.value!.id);
      pendingRemoval.value = undefined;
      detailProduct.value = undefined;
    } catch (problem) {
      removalError.value = (problem as Error).message;
    }
  });
}
const { brands, categories, brandName, categoryName } = useBusiness();
const formBusy = ref(false);
const search = ref(""),
  brandFilter = ref(""),
  categoryFilter = ref(""),
  availability = ref("");
const formOpen = ref(false),
  selectedProduct = ref<Product>(),
  detailProduct = ref<Product>();
const filteredProducts = computed(() =>
  products.value.filter(
    (product) =>
      (product.name + product.sku)
        .toLowerCase()
        .includes(search.value.toLowerCase()) &&
      (!brandFilter.value || product.brandId === brandFilter.value) &&
      (!categoryFilter.value || product.categoryId === categoryFilter.value) &&
      (!availability.value ||
        (availability.value === "Inativo"
          ? product.status === "inactive"
          : stockStatus(product) === availability.value)),
  ),
);
function openForm(product?: Product) {
  selectedProduct.value = product;
  formOpen.value = true;
}
const { page, pages, rows } = usePagination(filteredProducts);
</script>
<template>
  <div>
    <div class="page-heading">
      <div>
        <div class="eyebrow">SEU MIX DE BELEZA</div>
        <h1>Produtos</h1>
        <p>Organize os produtos que suas clientes adoram.</p>
      </div>
      <button class="button" @click="openForm()">
        <Icon name="plus" :size="17" />Novo produto
      </button>
    </div>
    <div class="metric-grid">
      <MetricCard
        label="Produtos cadastrados"
        :amount="products.length"
        icon="products"
      /><MetricCard
        label="Marcas no catálogo"
        :amount="brands.length"
        icon="leaf"
      /><MetricCard
        label="Estoque disponível"
        :amount="
          products.reduce((sum, product) => sum + product.stock, 0) + ' un.'
        "
        icon="inventory"
      /><MetricCard
        label="Valor de venda do estoque"
        :amount="
          money(
            products.reduce(
              (sum, product) => sum + product.stock * product.salePrice,
              0,
            ),
          )
        "
        icon="finance"
      />
    </div>
    <ClassificationManager />
    <section class="panel">
      <div class="panel-header">
        <h2>
          Todos os produtos <small>({{ filteredProducts.length }})</small>
        </h2>
        <Icon name="filter" :size="17" class="text-sage-600" />
      </div>
      <div class="toolbar">
        <div class="search-field">
          <Icon name="search" :size="17" /><input
            v-model="search"
            placeholder="Pesquisar por nome ou SKU..."
            aria-label="Pesquisar produtos"
          />
        </div>
        <select v-model="brandFilter" aria-label="Filtrar marca">
          <option value="">Todas as marcas</option>
          <option v-for="brand in brands" :key="brand.id" :value="brand.id">
            {{ brand.name }}
          </option></select
        ><select v-model="categoryFilter" aria-label="Filtrar categoria">
          <option value="">Todas as categorias</option>
          <option
            v-for="category in categories"
            :key="category.id"
            :value="category.id"
          >
            {{ category.name }}
          </option></select
        ><select v-model="availability" aria-label="Filtrar disponibilidade">
          <option value="">Disponibilidade</option>
          <option>Em estoque</option>
          <option>Estoque baixo</option>
          <option>Sem estoque</option>
          <option>Inativo</option>
        </select>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Marca / categoria</th>
              <th>Custo</th>
              <th>Preço de venda</th>
              <th>Estoque</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="product in rows" :key="product.id">
              <td>
                <div class="product-cell">
                  <span class="product-thumbnail"
                    ><Icon name="products" :size="18"
                  /></span>
                  <div>
                    <strong>{{ product.name }}</strong
                    ><small>{{ product.sku }}</small>
                  </div>
                </div>
              </td>
              <td>
                <span class="brand-pill">{{ brandName(product.brandId) }}</span
                ><small>{{ categoryName(product.categoryId) }}</small>
              </td>
              <td>{{ money(product.costPrice) }}</td>
              <td>
                <strong>{{ money(product.salePrice) }}</strong>
              </td>
              <td>{{ product.stock }} un.</td>
              <td>
                <StatusBadge
                  :status="
                    product.status === 'inactive'
                      ? 'Inativo'
                      : stockStatus(product)
                  "
                />
              </td>
              <td>
                <button
                  class="icon-button"
                  :aria-label="'Detalhes de ' + product.name"
                  @click="detailProduct = product"
                >
                  <Icon name="eye" :size="17" /></button
                ><button
                  class="icon-button"
                  :aria-label="'Editar ' + product.name"
                  @click="openForm(product)"
                >
                  <Icon name="edit" :size="16" />
                </button>
                <button
                  class="icon-button"
                  :aria-label="'Excluir ' + product.name"
                  @click="
                    pendingRemoval = product;
                    removalError = '';
                  "
                >
                  <Icon name="trash" :size="16" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <ListPagination v-model:page="page" :pages="pages" />
      </div>
      <EmptyState v-if="!filteredProducts.length" />
      <div class="table-footer">
        <span>{{ filteredProducts.length }} produtos encontrados</span
        ><span>Catálogo atualizado em tempo real</span>
      </div>
    </section>
    <Modal
      v-if="pendingRemoval"
      title="Excluir produto?"
      :busy="removing"
      @close="pendingRemoval = undefined"
    >
      <p>Deseja excluir {{ pendingRemoval.name }} do catálogo?</p>
      <p>
        O produto deixa de estar disponível para novas compras. Pedidos, valores
        históricos e movimentações existentes permanecem registrados.
      </p>
      <p v-if="!demo">
        Na API, esta ação inativa o produto; o registro continua disponível na
        administração.
      </p>
      <p v-if="removalError" role="alert">{{ removalError }}</p>
      <div class="form-actions">
        <button
          class="button secondary"
          :disabled="removing"
          @click="pendingRemoval = undefined"
        >
          Manter produto
        </button>
        <LoadingButton
          class="danger"
          :loading="removing"
          @click="confirmRemoval"
          >Confirmar exclusão</LoadingButton
        >
      </div>
    </Modal>
    <Modal
      v-if="formOpen"
      :busy="formBusy"
      :title="selectedProduct ? 'Editar produto' : 'Novo produto'"
      @close="formOpen = false"
      ><ProductForm
        @busy="formBusy = $event"
        :product="selectedProduct"
        @close="formOpen = false"
        @saved="formOpen = false" /></Modal
    ><Modal
      v-if="detailProduct"
      :title="detailProduct.name"
      @close="detailProduct = undefined"
      ><p>
        {{ brandName(detailProduct.brandId) }} ·
        {{ categoryName(detailProduct.categoryId) }} · {{ detailProduct.sku }}
      </p>
      <div class="detail-summary">
        <div>
          <small>Preço de venda</small
          ><strong>{{ money(detailProduct.salePrice) }}</strong>
        </div>
        <div>
          <small>Preço de custo</small
          ><strong>{{ money(detailProduct.costPrice) }}</strong>
        </div>
        <div>
          <small>Estoque / mínimo</small
          ><strong
            >{{ detailProduct.stock }} /
            {{ detailProduct.minimumStock }}</strong
          >
        </div>
      </div>
      <StatusBadge :status="stockStatus(detailProduct)" />
      <div class="form-actions">
        <button
          class="button"
          @click="
            openForm(detailProduct);
            detailProduct = undefined;
          "
        >
          Editar produto
        </button>
      </div></Modal
    >
  </div>
</template>

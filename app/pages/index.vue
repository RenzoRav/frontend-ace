<script setup lang="ts">
import type { CartLine, Order, Product } from "~/types";
import { money } from "~/utils/domain";
const { isLoading, runWithLoading } = useLoading();
definePageMeta({ layout: "store", alias: ["/home", "/loja"] });
const {
  state,
  brands,
  categories,
  brandName,
  productName,
  productPrice,
  createOrder,
} = useBusiness();
const cart = useState<CartLine[]>("store-cart", () => []);
const failedImages = ref<Record<string, boolean>>({});
const selectedProduct = ref<Product>();
const search = ref(""),
  brandFilter = ref(""),
  categoryFilter = ref(""),
  stockOnly = ref(false),
  cartOpen = ref(false),
  customerName = ref(""),
  customerPhone = ref(""),
  error = ref(""),
  confirmation = ref<Order>();
const filteredProducts = computed(() =>
  state.value.products.filter(
    (product) =>
      product.status === "active" &&
      product.name.toLowerCase().includes(search.value.toLowerCase()) &&
      (!brandFilter.value || product.brandId === brandFilter.value) &&
      (!categoryFilter.value || product.categoryId === categoryFilter.value) &&
      (!stockOnly.value || product.stock > 0),
  ),
);
const productFor = (productId: string) =>
  state.value.products.find((product) => product.id === productId)!;
const total = computed(
  () =>
    Math.round(
      cart.value.reduce(
        (sum, line) => sum + productPrice(line.productId) * line.quantity,
        0,
      ) * 100,
    ) / 100,
);
const cartCount = computed(() =>
  cart.value.reduce((sum, line) => sum + line.quantity, 0),
);
function addToCart(productId: string) {
  const line = cart.value.find((line) => line.productId === productId);
  if (line) {
    if (line.quantity >= productFor(productId).stock) {
      useBusiness().notify("Quantidade máxima disponível atingida.");
      return;
    }
    line.quantity++;
  } else cart.value.push({ productId, quantity: 1 });
  useBusiness().notify("Produto adicionado ao carrinho.");
}
async function submit() {
  cartOpen.value = false;
  await navigateTo("/checkout");
}
</script>
<template>
  <div>
    <section class="store-intro">
      <h1>SA Perfumaria</h1>
      <p>Consulte os produtos e adicione os itens ao carrinho.</p>
    </section>
    <div class="page-heading mt-8 mb-4">
      <div>
        <h2>Produtos</h2>
        <p>{{ filteredProducts.length }} produtos selecionados para você</p>
      </div>
      <button class="button" @click="cartOpen = true">
        <Icon name="cart" :size="17" />Carrinho ({{ cartCount }})
      </button>
    </div>
    <section class="panel">
      <div class="toolbar">
        <div class="search-field">
          <Icon name="search" :size="17" /><input
            v-model="search"
            placeholder="O que você procura hoje?"
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
        ><label class="inline"
          ><input v-model="stockOnly" type="checkbox" />Em estoque</label
        >
      </div>
    </section>
    <div class="store-grid">
      <article
        v-for="product in filteredProducts"
        :key="product.id"
        class="store-card"
      >
        <div class="product-visual" :class="product.brandId">
          <span class="brand-pill">{{ brandName(product.brandId) }}</span
          ><img
            loading="lazy"
            decoding="async"
            width="320"
            height="320"
            v-if="product.imageUrl && !failedImages[product.id]"
            :src="product.imageUrl"
            @error="failedImages[product.id] = true"
            :alt="product.name"
            class="h-32 object-contain"
          />
          <span v-else class="product-placeholder">Sem imagem</span>
        </div>
        <div class="store-card-body">
          <h3>{{ product.name }}</h3>
          <button
            type="button"
            class="text-link"
            :aria-label="'Ver detalhes de ' + product.name"
            @click="selectedProduct = product"
          >
            Ver detalhes
          </button>
          <strong class="store-price">{{
            money(productPrice(product.id))
          }}</strong
          ><StatusBadge
            :status="product.stock ? 'Disponível' : 'Indisponível'"
          /><button
            class="button secondary"
            :disabled="!product.stock"
            :aria-label="'Adicionar ' + product.name + ' ao carrinho'"
            @click="addToCart(product.id)"
          >
            <Icon name="plus" :size="15" />{{
              product.stock ? "Adicionar ao carrinho" : "Sem estoque"
            }}
          </button>
        </div>
      </article>
    </div>
    <ProductDetails
      v-if="selectedProduct"
      :product="selectedProduct"
      @close="selectedProduct = undefined"
      @add="addToCart(selectedProduct.id)"
    /><EmptyState v-if="!filteredProducts.length" /><Modal
      v-if="cartOpen"
      :busy="isLoading"
      title="Seu carrinho"
      wide
      @close="cartOpen = false"
      ><form @submit.prevent="submit" :aria-busy="isLoading">
        <fieldset class="loading-fieldset" :disabled="isLoading">
          <div
            v-for="(line, index) in cart"
            :key="line.productId"
            class="cart-line"
          >
            <div class="line-name">
              <strong>{{ productName(line.productId) }}</strong
              ><small class="block"
                >{{ money(productPrice(line.productId)) }} / un.</small
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
              money(productPrice(line.productId) * line.quantity)
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
          <EmptyState
            v-if="!cart.length"
            title="Seu carrinho está esperando por você"
            description="Adicione seus produtos favoritos para fazer um pedido."
          /><template v-else
            ><div class="cart-total">
              <span>Total do pedido</span><span>{{ money(total) }}</span>
            </div>
            <p class="text-xs mt-4">
              Confira seus itens e continue para finalizar o pedido.
            </p>
            <NuxtLink
              to="/checkout"
              class="button mt-4"
              @click="cartOpen = false"
              >Ir para checkout</NuxtLink
            >
            <p v-if="error" class="error-message" role="alert">{{ error }}</p>
            <div class="form-actions">
              <button
                type="button"
                class="button secondary"
                @click="cartOpen = false"
              >
                Continuar comprando
              </button>
            </div></template
          >
        </fieldset>
      </form></Modal
    ><Modal
      v-if="confirmation"
      title="Pedido enviado"
      @close="confirmation = undefined"
      ><div class="empty">
        <Icon name="check" :size="40" />
        <h2>Recebemos seu pedido {{ confirmation.number }}</h2>
        <p>
          Seu pedido de {{ money(confirmation.total) }} já está com a
          revendedora. Ela entrará em contato para combinar os próximos passos.
        </p>
        <button class="button" @click="confirmation = undefined">
          Continuar no catálogo
        </button>
      </div></Modal
    >
  </div>
</template>

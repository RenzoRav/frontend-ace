<script setup lang="ts">
import type { Product } from "~/types";
import { money } from "~/utils/domain";
const props = defineProps<{ product: Product }>();
defineEmits<{ close: []; add: [] }>();
const { brandName, categoryName, productPrice } = useBusiness();
const failed = ref(false);
watch(
  () => props.product.id,
  () => (failed.value = false),
);
</script>
<template>
  <Modal :title="product.name" @close="$emit('close')">
    <img
      loading="lazy"
      decoding="async"
      width="320"
      height="320"
      v-if="product.imageUrl && !failed"
      :src="product.imageUrl"
      :alt="product.name"
      class="h-40 mx-auto object-contain"
      @error="failed = true"
    />
    <div v-else class="product-visual"><Icon name="products" :size="64" /></div>
    <p>
      {{ brandName(product.brandId) }} · {{ categoryName(product.categoryId) }}
    </p>
    <p class="section-gap">
      {{ product.description || "Descrição ainda não cadastrada." }}
    </p>
    <strong class="store-price">{{ money(productPrice(product.id)) }}</strong>
    <p>{{ product.stock }} unidades disponíveis</p>
    <div class="form-actions">
      <button class="button secondary" @click="$emit('close')">Fechar</button
      ><button
        class="button"
        :disabled="!product.stock || product.status !== 'active'"
        @click="$emit('add')"
      >
        Adicionar ao carrinho
      </button>
    </div>
  </Modal>
</template>

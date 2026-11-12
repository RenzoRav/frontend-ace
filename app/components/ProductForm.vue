<script setup lang="ts">
import type { Product } from "~/types";
const props = defineProps<{ product?: Product }>();
const emit = defineEmits<{ saved: []; close: []; busy: [loading: boolean] }>();
const { isLoading, runWithLoading } = useLoading((loading) =>
  emit("busy", loading),
);
const { brands, categories, saveProduct, state } = useBusiness();
const form = reactive<Product>(
  props.product
    ? { ...props.product }
    : {
        id: "",
        name: "",
        brandId: brands.value[0]?.id || "",
        categoryId: categories.value[0]?.id || "",
        sku: "",
        costPrice: 0,
        salePrice: 0,
        stock: 0,
        minimumStock: 5,
        status: "active",
      },
);
const error = ref("");
async function submit() {
  if (isLoading.value) return;
  error.value = "";
  await runWithLoading(async () => {
    if (!form.name.trim()) {
      error.value = "Preencha o nome do produto.";
      return;
    }
    if (
      form.sku.trim() &&
      state.value.products.some(
        (product) =>
          product.sku.toLowerCase() === form.sku.trim().toLowerCase() &&
          product.id !== form.id,
      )
    ) {
      error.value = "Esse SKU já está em uso.";
      return;
    }
    if (
      ![form.costPrice, form.salePrice, form.stock, form.minimumStock].every(
        (amount) => Number.isFinite(amount) && amount >= 0,
      ) ||
      !Number.isInteger(form.stock) ||
      !Number.isInteger(form.minimumStock)
    ) {
      error.value = "Confira preços e quantidades.";
      return;
    }
    try {
      await saveProduct({
        ...form,
        name: form.name.trim(),
        sku: form.sku.trim(),
      });
      emit("saved");
    } catch (e) {
      error.value = (e as Error).message;
    }
  });
}
</script>
<template>
  <form @submit.prevent="submit" :aria-busy="isLoading">
    <fieldset class="loading-fieldset" :disabled="isLoading">
      <div class="form-grid">
        <label class="full"
          >Descrição<textarea v-model="form.description" rows="3" /></label
        ><label class="full"
          >URL da foto<input
            v-model="form.imageUrl"
            type="url"
            placeholder="https://..."
        /></label>
        <label class="full"
          >Nome do produto<input
            v-model="form.name"
            maxlength="120"
            required
            placeholder="Ex.: Floratta Red 75ml" /></label
        ><label
          >Marca<select v-model="form.brandId">
            <option v-for="brand in brands" :key="brand.id" :value="brand.id">
              {{ brand.name }}
            </option>
          </select></label
        ><label
          >Categoria<select v-model="form.categoryId">
            <option
              v-for="category in categories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.name }}
            </option>
          </select></label
        ><label
          >SKU (opcional)<input
            v-model="form.sku"
            maxlength="80"
            placeholder="FL-1026" /></label
        ><label
          >Status<select v-model="form.status">
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </select></label
        ><label
          >Preço de custo (R$)<input
            v-model.number="form.costPrice"
            type="number"
            min="0"
            step="0.01"
            required /></label
        ><label
          >Preço de venda (R$)<input
            v-model.number="form.salePrice"
            type="number"
            min="0.01"
            step="0.01"
            required /></label
        ><label
          >Estoque atual<input
            v-model.number="form.stock"
            type="number"
            min="0"
            step="1"
            required /></label
        ><label
          >Estoque mínimo<input
            v-model.number="form.minimumStock"
            type="number"
            min="0"
            step="1"
            required
        /></label>
      </div>
      <p v-if="error" class="error-message" role="alert">{{ error }}</p>
      <div class="form-actions">
        <button type="button" class="button secondary" @click="emit('close')">
          Cancelar</button
        ><LoadingButton
          :loading="isLoading"
          loading-text="Salvando produto..."
          type="submit"
        >
          {{ product ? "Salvar alterações" : "Cadastrar produto" }}
        </LoadingButton>
      </div>
    </fieldset>
  </form>
</template>

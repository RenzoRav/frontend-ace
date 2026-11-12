<script setup lang="ts">
import { identifier } from "~/utils/domain";
const { state, saveClassification } = useBusiness();
const kind = ref<"brands" | "categories">("brands"),
  name = ref(""),
  id = ref(""),
  error = ref("");
const { isLoading, runWithLoading } = useLoading();
async function submit() {
  error.value = "";
  await runWithLoading(async () => {
    try {
      await saveClassification(kind.value, {
        id: id.value || identifier(),
        name: name.value,
        color: "#777777",
      });
      name.value = "";
      id.value = "";
    } catch (e) {
      error.value = (e as Error).message;
    }
  });
}
</script>
<template>
  <details class="panel section-gap">
    <summary class="panel-header">Gerenciar marcas e categorias</summary>
    <div class="panel-body">
      <form class="client-form" @submit.prevent="submit">
        <fieldset :disabled="isLoading">
          <label
            >Tipo de classificação<select
              v-model="kind"
              @change="
                id = '';
                name = '';
              "
            >
              <option value="brands">Marca</option>
              <option value="categories">Categoria</option>
            </select></label
          ><label
            >Nome da classificação<input v-model="name" required maxlength="80"
          /></label>
        </fieldset>
        <p v-if="error" role="alert">{{ error }}</p>
        <LoadingButton type="submit" :loading="isLoading"
          >Salvar classificação</LoadingButton
        ><button
          type="button"
          class="button secondary"
          @click="
            id = '';
            name = '';
          "
        >
          Nova classificação
        </button>
      </form>
      <div class="mini-list" v-for="item in state[kind]" :key="item.id">
        <strong>{{ item.name }}</strong
        ><button
          class="button secondary small"
          :aria-label="'Editar classificação ' + item.name"
          @click="
            id = item.id;
            name = item.name;
          "
        >
          Editar
        </button>
      </div>
    </div>
  </details>
</template>

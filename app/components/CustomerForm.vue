<script setup lang="ts">
import type { Customer } from "~/types";
import { today, whatsappLink } from "~/utils/domain";
const props = defineProps<{ customer?: Customer }>();
const emit = defineEmits<{ saved: []; close: []; busy: [loading: boolean] }>();
const { isLoading, runWithLoading } = useLoading((loading) =>
  emit("busy", loading),
);
const { saveCustomer } = useBusiness();
const form = reactive<Customer>(
  props.customer
    ? { ...props.customer }
    : { id: "", name: "", phone: "", birthday: "", createdAt: today() },
);
const error = ref("");
async function submit() {
  if (isLoading.value) return;
  error.value = "";
  await runWithLoading(async () => {
    try {
      if (!form.name.trim()) throw new Error("Informe o nome do cliente.");
      whatsappLink(form.phone, "");
      if (form.birthday && form.birthday > today())
        throw new Error("Confira a data de nascimento.");
      await saveCustomer({ ...form, name: form.name.trim() });
      emit("saved");
    } catch (problem) {
      error.value = (problem as Error).message;
    }
  });
}
</script>
<template>
  <form @submit.prevent="submit" :aria-busy="isLoading">
    <fieldset class="loading-fieldset" :disabled="isLoading">
      <div class="form-grid">
        <label class="full"
          >Nome completo<input
            v-model="form.name"
            maxlength="120"
            required
            placeholder="Nome do cliente" /></label
        ><label class="full"
          >Telefone com DDD<input
            v-model="form.phone"
            maxlength="20"
            required
            type="tel"
            placeholder="(11) 90000-0000" /></label
        ><label class="full"
          >Data de nascimento<input
            v-model="form.birthday"
            :required="!form.id"
            type="date"
            :max="today()"
        /></label>
      </div>
      <p v-if="error" class="error-message" role="alert">{{ error }}</p>
      <div class="form-actions">
        <button type="button" class="button secondary" @click="emit('close')">
          Cancelar</button
        ><LoadingButton
          :loading="isLoading"
          loading-text="Salvando cliente..."
          type="submit"
        >
          {{ customer ? "Salvar alterações" : "Cadastrar cliente" }}
        </LoadingButton>
      </div>
    </fieldset>
  </form>
</template>

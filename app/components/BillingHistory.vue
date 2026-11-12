<script setup lang="ts">
import { money } from "~/utils/domain";
const { state, customerName, confirmBilling, billingLink } = useBusiness();
const id = ref("");
const { isLoading, runWithLoading } = useLoading();
const open = computed(() =>
  state.value.installments.filter((p) => !p.paidAt && !p.cancelledAt),
);
async function sent() {
  if (!id.value) return;
  await runWithLoading(async () => {
    await confirmBilling(id.value);
    id.value = "";
  });
}
</script>
<template>
  <section class="panel section-gap">
    <div class="panel-header"><h2>Histórico de cobranças</h2></div>
    <div class="panel-body">
      <p>
        Abrir WhatsApp prepara a mensagem, mas não comprova envio. Registre
        abaixo somente o envio que você declarou realizar.
      </p>
      <label
        >Parcela para cobrança<select v-model="id" :disabled="isLoading">
          <option value="">Selecione</option>
          <option v-for="p in open" :key="p.id" :value="p.id">
            {{ customerName(p.customerId) }} · {{ p.number }}/{{ p.count }} ·
            {{ money(p.amount) }}
          </option>
        </select></label
      >
      <div v-if="id" class="form-actions">
        <a
          :href="billingLink(id)"
          target="_blank"
          rel="noopener"
          class="button secondary"
          >Preparar no WhatsApp</a
        ><LoadingButton :loading="isLoading" @click="sent"
          >Confirmar que enviei a cobrança</LoadingButton
        >
      </div>
      <div v-for="b in state.billingRecords" :key="b.id" class="mini-list">
        <div>
          <strong
            >Envio declarado ·
            {{
              new Date(b.sentAt).toLocaleString("pt-BR", {
                timeZone: "America/Sao_Paulo",
              })
            }}</strong
          >
          <p>{{ b.message }}</p>
        </div>
      </div>
      <p v-if="!state.billingRecords?.length">Nenhum envio declarado.</p>
    </div>
  </section>
</template>

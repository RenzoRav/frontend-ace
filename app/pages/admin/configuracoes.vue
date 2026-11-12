<script setup lang="ts">
import { validateSettings } from "~/utils/commerce/settings";
const { state, settings, saveSettings, notify, resetDemo } = useBusiness();
const { demo } = useStoreMode();
const form = reactive({ ...settings.value });
const error = ref("");
const { isLoading, runWithLoading } = useLoading();
async function save() {
  await runWithLoading(async () => {
    error.value = "";
    try {
      await saveSettings(validateSettings(form));
      notify("Configuração comercial salva.");
    } catch (problem) {
      error.value = (problem as Error).message;
    }
  });
}
const confirmation = ref(false);
function reset() {
  resetDemo();
  confirmation.value = false;
  notify("Dados iniciais restaurados.");
}
</script>
<template>
  <div>
    <div class="page-heading">
      <div>
        <div class="eyebrow">SEU ESPAÇO DE TRABALHO</div>
        <h1>Configurações</h1>
        <p>Gerencie as preferências da loja e as configurações comerciais.</p>
      </div>
    </div>
    <section v-if="state.migrationIssues?.length" class="panel max-w-3xl mb-6">
      <div class="panel-header"><h2>Pendências dos dados antigos</h2></div>
      <div class="panel-body">
        <p>
          Revise os cadastros conflitantes. Os registros originais foram
          preservados.
        </p>
        <p v-for="issue in state.migrationIssues" :key="issue.id">
          {{ issue.entityId }} — {{ issue.message }}
        </p>
        <NuxtLink to="/admin/clientes">Revisar clientes</NuxtLink>
      </div>
    </section>
    <section class="panel max-w-3xl mb-6">
      <div class="panel-header"><h2>Configuração comercial</h2></div>
      <form class="panel-body" @submit.prevent="save">
        <fieldset :disabled="isLoading" class="form-grid">
          <label class="full"
            >WhatsApp comercial (opcional)<input
              v-model="form.managerPhone"
              type="tel"
              maxlength="20"
              placeholder="Configure quando tiver o número definitivo"
          /></label>
          <label
            >Antecedência dos alertas (dias)<input
              v-model.number="form.alertDays"
              type="number"
              min="0"
              max="90"
              step="1"
              required
          /></label>
          <label
            >Frete de entrega (R$)<input
              v-model.number="form.deliveryFee"
              type="number"
              min="0"
              max="99999999.99"
              step="0.01"
              required
          /></label>
          <label
            ><input v-model="form.deliveryEnabled" type="checkbox" /> Permitir
            entrega</label
          >
          <label
            ><input v-model="form.pickupEnabled" type="checkbox" /> Permitir
            retirada</label
          >
        </fieldset>
        <p>
          Sem telefone configurado, o envio de pedidos pelo WhatsApp fica
          desativado. Os alertas incluem hoje e os próximos dias definidos
          acima.
        </p>
        <p v-if="error" role="alert">{{ error }}</p>
        <LoadingButton type="submit" :loading="isLoading" class="mt-5"
          >Salvar configuração comercial</LoadingButton
        >
      </form>
    </section>
    <section v-if="demo" class="panel max-w-3xl">
      <div class="panel-header">
        <h2>Sobre o sistema</h2>
        <Icon name="products" class="text-sage-600" />
      </div>
      <div class="panel-body">
        <h3>Seu negócio de beleza, organizado</h3>
        <p class="mt-3 text-sm">
          Organize seus produtos, acompanhe pedidos e cuide do relacionamento
          com suas clientes.
        </p>
        <p class="mt-3 text-sm">
          Acesse o catálogo da loja e acompanhe as compras pelo painel.
        </p>
        <NuxtLink to="/loja" class="button secondary mt-5"
          >Abrir minha loja <Icon name="external" :size="15"
        /></NuxtLink>
      </div>
    </section>
    <section v-if="demo" class="panel max-w-3xl mt-6">
      <div class="panel-header"><h2>Dados iniciais</h2></div>
      <div class="panel-body">
        <p class="text-sm">
          Restaure os produtos, clientes, vendas e pedidos iniciais para uma
          recomeçar a organização da loja.
        </p>
        <button class="button secondary mt-5" @click="confirmation = true">
          Restaurar dados iniciais
        </button>
      </div>
    </section>
    <Modal
      v-if="confirmation"
      title="Restaurar dados iniciais?"
      @close="confirmation = false"
      ><p>
        As alterações deste navegador serão substituídas pelos dados iniciais.
        Você deseja continuar?
      </p>
      <div class="form-actions">
        <button class="button secondary" @click="confirmation = false">
          Manter meus dados</button
        ><button class="button danger" @click="reset">Restaurar dados</button>
      </div></Modal
    >
  </div>
</template>

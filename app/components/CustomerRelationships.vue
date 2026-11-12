<script setup lang="ts">
import { today } from "~/utils/domain";
const { state, grantBenefit, registerGift, birthdayLink } = useBusiness();
const customerId = ref(""),
  couponId = ref(""),
  year = ref(Number(today().slice(0, 4))),
  description = ref(""),
  date = ref(today()),
  error = ref("");
const { isLoading, runWithLoading } = useLoading();
async function submit(kind: string) {
  error.value = "";
  await runWithLoading(async () => {
    try {
      if (kind === "benefit")
        await grantBenefit(
          customerId.value,
          couponId.value || null,
          year.value,
        );
      else {
        await registerGift(customerId.value, description.value, date.value);
        description.value = "";
      }
    } catch (e) {
      error.value = (e as Error).message;
    }
  });
}
</script>
<template>
  <section class="panel section-gap">
    <div class="panel-header"><h2>Aniversário, benefícios e brindes</h2></div>
    <div class="panel-body">
      <label
        >Cliente do benefício<select v-model="customerId" :disabled="isLoading">
          <option value="">Selecione um cliente</option>
          <option v-for="c in state.customers" :key="c.id" :value="c.id">
            {{ c.name }}
          </option>
        </select></label
      ><template v-if="customerId"
        ><a
          :href="birthdayLink(customerId)"
          class="button secondary mt-4"
          target="_blank"
          rel="noopener"
          >Mensagem de aniversário pelo WhatsApp</a
        >
        <p>A mensagem é preparada; nenhum envio ocorre automaticamente.</p>
        <p v-if="error" role="alert">{{ error }}</p>
        <form
          class="client-form section-gap"
          @submit.prevent="submit('benefit')"
        >
          <fieldset :disabled="isLoading">
            <div class="form-grid">
              <label
                >Ano do benefício<input
                  v-model.number="year"
                  type="number"
                  min="1900"
                  max="9999"
                  step="1"
                  required /></label
              ><label
                >Cupom do benefício (opcional)<select v-model="couponId">
                  <option value="">Sem cupom</option>
                  <option v-for="c in state.coupons" :key="c.id" :value="c.id">
                    {{ c.code }}
                  </option>
                </select></label
              >
            </div>
          </fieldset>
          <LoadingButton type="submit" :loading="isLoading"
            >Conceder benefício</LoadingButton
          >
        </form>
        <form class="client-form section-gap" @submit.prevent="submit('gift')">
          <fieldset :disabled="isLoading">
            <div class="form-grid">
              <label
                >Descrição do brinde<input
                  v-model="description"
                  maxlength="150"
                  required /></label
              ><label
                >Data do brinde<input v-model="date" type="date" required
              /></label>
            </div>
          </fieldset>
          <LoadingButton type="submit" :loading="isLoading"
            >Registrar brinde</LoadingButton
          >
        </form>
        <h3 class="section-gap">Histórico desta cliente</h3>
        <div
          v-for="b in (state.birthdayBenefits || []).filter(
            (b) => b.customerId === customerId,
          )"
          :key="b.id"
          class="mini-list"
        >
          Benefício {{ b.year }} ·
          {{
            b.couponId
              ? state.coupons?.find((c) => c.id === b.couponId)?.code
              : "Sem cupom"
          }}
          · {{ b.grantedAt.slice(0, 10) }}
        </div>
        <div
          v-for="g in (state.gifts || []).filter(
            (g) => g.customerId === customerId,
          )"
          :key="g.id"
          class="mini-list"
        >
          Brinde: {{ g.description }} · {{ g.date }}
        </div></template
      >
    </div>
  </section>
</template>

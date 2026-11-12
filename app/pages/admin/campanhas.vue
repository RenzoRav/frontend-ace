<script setup lang="ts">
import type { Coupon, Promotion, InterestRate } from "~/types";
import { identifier, today, addMonths, money } from "~/utils/domain";
const { state, saveCoupon, savePromotion, saveRate, notify } = useBusiness();
const { isLoading, runWithLoading } = useLoading();
const error = ref("");
const emptyCoupon = (): Coupon => ({
  id: "",
  code: "",
  discountType: "percent",
  value: 10,
  startsAt: today(),
  endsAt: addMonths(today(), 1),
  usageLimit: null,
});
const emptyPromotion = (): Promotion => ({
  id: "",
  name: "",
  discount: 10,
  startsAt: today(),
  endsAt: addMonths(today(), 1),
});
const coupon = ref(emptyCoupon()),
  promotion = ref(emptyPromotion()),
  products = ref<string[]>([]),
  rate = ref<InterestRate>({ id: "", count: 3, percent: 0 });
async function submit(kind: string) {
  error.value = "";
  await runWithLoading(async () => {
    try {
      if (kind === "coupon") {
        await saveCoupon({
          ...coupon.value,
          id: coupon.value.id || identifier(),
          usageLimit:
            coupon.value.usageLimit === null ||
            String(coupon.value.usageLimit) === ""
              ? null
              : coupon.value.usageLimit,
        });
        coupon.value = emptyCoupon();
      }
      if (kind === "promotion") {
        await savePromotion(
          { ...promotion.value, id: promotion.value.id || identifier() },
          products.value,
        );
        promotion.value = emptyPromotion();
        products.value = [];
      }
      if (kind === "rate") {
        await saveRate({ ...rate.value, id: rate.value.id || identifier() });
        rate.value = { id: "", count: 3, percent: 0 };
      }
      notify("Condições comerciais salvas.");
    } catch (e) {
      error.value = (e as Error).message;
    }
  });
}
function editPromotion(item: Promotion) {
  promotion.value = { ...item };
  products.value = (state.value.productPromotions || [])
    .filter((p) => p.promotionId === item.id)
    .map((p) => p.productId);
}
</script>
<template>
  <div>
    <div class="page-heading">
      <div>
        <h1>Cupons e promoções</h1>
        <p>
          Condições locais; valores contratados em pedidos anteriores são
          preservados.
        </p>
      </div>
    </div>
    <p v-if="error" role="alert" class="error-message">{{ error }}</p>
    <section class="panel">
      <div class="panel-header"><h2>Cupons</h2></div>
      <div class="panel-body">
        <form class="client-form" @submit.prevent="submit('coupon')">
          <fieldset :disabled="isLoading">
            <div class="form-grid">
              <label
                >Código do cupom<input
                  v-model="coupon.code"
                  maxlength="30"
                  required /></label
              ><label
                >Tipo de desconto<select v-model="coupon.discountType">
                  <option value="percent">Percentual</option>
                  <option value="fixed">Valor em reais</option>
                </select></label
              >
              <label
                >Valor do cupom<input
                  v-model.number="coupon.value"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required /></label
              ><label
                >Limite de uso (vazio: ilimitado)<input
                  v-model.number="coupon.usageLimit"
                  type="number"
                  min="1"
                  step="1"
              /></label>
              <label
                >Início do cupom<input
                  v-model="coupon.startsAt"
                  type="date"
                  required /></label
              ><label
                >Fim do cupom<input
                  v-model="coupon.endsAt"
                  type="date"
                  required
              /></label>
            </div>
          </fieldset>
          <div class="form-actions">
            <button
              type="button"
              class="button secondary"
              @click="coupon = emptyCoupon()"
            >
              Novo cupom</button
            ><LoadingButton type="submit" :loading="isLoading"
              >Salvar cupom</LoadingButton
            >
          </div>
        </form>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Desconto</th>
                <th>Validade</th>
                <th>Usos</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in state.coupons" :key="c.id">
                <td>{{ c.code }}</td>
                <td>
                  {{
                    c.discountType === "percent"
                      ? c.value + "%"
                      : money(c.value)
                  }}
                </td>
                <td>{{ c.startsAt }} a {{ c.endsAt }}</td>
                <td>
                  {{
                    state.orders.filter(
                      (o) => o.couponId === c.id && o.status !== "Cancelado",
                    ).length
                  }}
                  / {{ c.usageLimit || "ilimitado" }}
                </td>
                <td>
                  <button
                    class="button secondary small"
                    :aria-label="'Editar cupom ' + c.code"
                    @click="coupon = { ...c }"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
    <section class="panel section-gap">
      <div class="panel-header"><h2>Promoções por produto</h2></div>
      <div class="panel-body">
        <form class="client-form" @submit.prevent="submit('promotion')">
          <fieldset :disabled="isLoading">
            <div class="form-grid">
              <label
                >Nome da promoção<input
                  v-model="promotion.name"
                  maxlength="80"
                  required /></label
              ><label
                >Desconto da promoção (%)<input
                  v-model.number="promotion.discount"
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  required /></label
              ><label
                >Início da promoção<input
                  v-model="promotion.startsAt"
                  type="date"
                  required /></label
              ><label
                >Fim da promoção<input
                  v-model="promotion.endsAt"
                  type="date"
                  required
              /></label>
            </div>
            <h3>Produtos da promoção</h3>
            <div class="max-h-48 overflow-auto">
              <label
                v-for="p in state.products"
                :key="p.id"
                class="checkbox-label"
                ><input v-model="products" type="checkbox" :value="p.id" />{{
                  p.name
                }}</label
              >
            </div>
          </fieldset>
          <div class="form-actions">
            <button
              type="button"
              class="button secondary"
              @click="
                promotion = emptyPromotion();
                products = [];
              "
            >
              Nova promoção</button
            ><LoadingButton type="submit" :loading="isLoading"
              >Salvar promoção</LoadingButton
            >
          </div>
        </form>
        <div v-for="p in state.promotions" :key="p.id" class="mini-list">
          <div>
            <strong>{{ p.name }} · {{ p.discount }}%</strong
            ><small
              >{{ p.startsAt }} a {{ p.endsAt }} ·
              {{
                (state.productPromotions || []).filter(
                  (link) => link.promotionId === p.id,
                ).length
              }}
              produtos</small
            >
          </div>
          <button
            class="button secondary small"
            :aria-label="'Editar promoção ' + p.name"
            @click="editPromotion(p)"
          >
            Editar
          </button>
        </div>
        <p>
          Entre promoções sobrepostas, vale o maior desconto. Um cupom pode ser
          aplicado depois, somente nos produtos.
        </p>
      </div>
    </section>
    <section class="panel section-gap">
      <div class="panel-header"><h2>Taxas de parcelamento</h2></div>
      <div class="panel-body">
        <form class="client-form" @submit.prevent="submit('rate')">
          <fieldset :disabled="isLoading">
            <div class="form-grid">
              <label
                >Número de parcelas<input
                  v-model.number="rate.count"
                  type="number"
                  min="1"
                  max="12"
                  step="1"
                  required /></label
              ><label
                >Taxa única (%)<input
                  v-model.number="rate.percent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  required
              /></label>
            </div>
          </fieldset>
          <LoadingButton type="submit" :loading="isLoading"
            >Salvar taxa</LoadingButton
          >
        </form>
        <div v-for="r in state.interestRates" :key="r.id" class="mini-list">
          <strong>{{ r.count }} parcelas · {{ r.percent }}%</strong
          ><button
            class="button secondary small"
            :aria-label="'Editar taxa de ' + r.count + ' parcelas'"
            @click="rate = { ...r }"
          >
            Editar
          </button>
        </div>
        <p>
          Taxa simples sobre produtos líquidos + frete. Sem taxa cadastrada,
          aplica-se 0%, sem juros.
        </p>
      </div>
    </section>
  </div>
</template>

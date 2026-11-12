<script setup lang="ts">
import type { CartLine, PaymentMethod, Quote } from "~/types";
import type { OrderDto } from "~/utils/api/adapters";
import { ApiError } from "~/utils/api/client";
import { createPendingCheckout } from "~/utils/api/pending-checkout";
import type { PendingCheckout } from "~/utils/api/pending-checkout";
import { orderFromApi, paymentToApi } from "~/utils/api/adapters";
import { money, today, addMonths } from "~/utils/domain";
import { validateCustomer } from "~/utils/commerce/catalog";
definePageMeta({ layout: "store" });
const { demo } = useStoreMode();
const api = useNuxtApp().$api;
const business = useBusiness();
const access = useGuestAccess();
const { state, settings } = business;
const cart = useState<CartLine[]>("store-cart", () => []);
const customer = reactive({ name: "", phone: "", birthday: "" });
const address = reactive({
  id: "",
  label: "Entrega",
  zip: "",
  street: "",
  number: "",
  extra: "",
  district: "",
  city: "",
  uf: "SP",
});
const delivery = ref<"Entrega" | "Retirada">("Retirada"),
  method = ref<PaymentMethod>("PIX"),
  count = ref(1),
  coupon = ref("");
const error = ref(""),
  preview = ref<Quote | null>(null),
  calculating = ref(false);
const { isLoading, runWithLoading } = useLoading();
const recovery = ref<PendingCheckout | null>(null);
const pendingCheckout =
  !demo && import.meta.client
    ? createPendingCheckout({
        getItem: (key) => sessionStorage.getItem(key),
        setItem: (key, value) => sessionStorage.setItem(key, value),
        removeItem: (key) => sessionStorage.removeItem(key),
      })
    : null;
const installmentMethod = computed(() =>
  ["Cartão", "Parcelado"].includes(method.value),
);
const options = computed(() => ({
  lines: cart.value,
  paymentMethod: method.value,
  installmentCount: count.value,
  firstDueDate: addMonths(today(), 1),
  couponCode: coupon.value,
  shipping: delivery.value === "Entrega" ? settings.value.deliveryFee : 0,
}));
const orderInput = computed(() => ({
  paymentMethod: paymentToApi[method.value],
  installmentCount: installmentMethod.value ? count.value : 1,
  delivery: delivery.value === "Entrega",
  couponCode: coupon.value,
  items: cart.value,
}));
let generation = 0;
async function calculate() {
  const requestGeneration = ++generation;
  calculating.value = true;
  preview.value = null;
  error.value = "";
  try {
    if (!cart.value.length) return;
    if (demo) preview.value = business.quote(options.value);
    else {
      const result = await api.request<{
        subtotal: number;
        discount: number;
        shipping: number;
        interest: number;
        total: number;
        interestPercent: number;
        installments: number[];
      }>("/checkout/quote", {
        method: "POST",
        body: JSON.stringify(orderInput.value),
      });
      if (requestGeneration !== generation) return;
      preview.value = {
        ...result,
        items: [],
        couponId: null,
        interestRateId: null,
        schedule: result.installments.map((amount, index) => ({
          amount,
          dueDate: addMonths(today(), index + 1),
        })),
      };
    }
  } catch (problem) {
    if (requestGeneration === generation)
      error.value = (problem as Error).message;
  } finally {
    if (requestGeneration === generation) calculating.value = false;
  }
}
watch(options, calculate, { deep: true, immediate: true });
onMounted(() => {
  try {
    recovery.value = pendingCheckout?.read() || null;
  } catch (problem) {
    error.value = (problem as Error).message;
  }
  try {
    const saved = JSON.parse(
      sessionStorage.getItem("loja-checkout-customer") || "null",
    );
    if (
      saved &&
      typeof saved.name === "string" &&
      typeof saved.phone === "string" &&
      typeof saved.birthday === "string"
    )
      Object.assign(customer, saved);
  } catch {}
  if (!settings.value.pickupEnabled) delivery.value = "Entrega";
});
async function sendPending(attempt: PendingCheckout, initial = false) {
  try {
    const result = await api.request<OrderDto>("/checkout/orders", {
      method: "POST",
      headers: { "Idempotency-Key": attempt.key },
      body: attempt.payload,
    });
    access.remember(result.id, result.accessToken!);
    pendingCheckout!.complete();
    recovery.value = null;
    return result;
  } catch (problem) {
    // Only explicit rejection proves this request was not committed. Timeouts/5xx keep the recovery key.
    if (
      initial &&
      problem instanceof ApiError &&
      [400, 403, 404, 409, 422, 429].includes(problem.status)
    ) {
      pendingCheckout!.complete();
      recovery.value = null;
    }
    throw problem;
  }
}
async function recover() {
  if (!recovery.value) return;
  await runWithLoading(async () => {
    try {
      const result = await sendPending(recovery.value!);
      cart.value = [];
      await navigateTo("/pedidos/" + result.id);
    } catch (problem) {
      error.value = (problem as Error).message;
    }
  });
}
async function submit() {
  await runWithLoading(async () => {
    error.value = "";
    try {
      validateCustomer([], { ...customer, id: "", createdAt: today() });
      if (
        delivery.value === "Entrega" &&
        (!address.street.trim() ||
          !address.number.trim() ||
          !address.city.trim() ||
          !address.district.trim() ||
          !/^\d{8}$/.test(address.zip.replace(/\D/g, "")))
      )
        throw Error("Confira o endereço e o CEP de entrega.");
      let order;
      if (demo)
        order = business.createOrder(
          customer.name,
          customer.phone,
          cart.value,
          {
            ...options.value,
            birthday: customer.birthday,
            delivery: delivery.value,
            address: delivery.value === "Entrega" ? { ...address } : null,
          },
        );
      else {
        const attempt = pendingCheckout!.prepare(
          JSON.stringify({
            ...customer,
            order: orderInput.value,
            address:
              delivery.value === "Entrega"
                ? {
                    label: "Entrega",
                    postalCode: address.zip.replace(/\D/g, ""),
                    street: address.street,
                    number: address.number,
                    complement: address.extra,
                    district: address.district,
                    city: address.city,
                    state: address.uf,
                  }
                : null,
          }),
        );
        recovery.value = attempt;
        const result = await sendPending(attempt, true);
        order = orderFromApi(result);
        access.remember(result.id, result.accessToken!);
      }
      access.remember(order.id);
      try {
        sessionStorage.setItem(
          "loja-checkout-customer",
          JSON.stringify(customer),
        );
        sessionStorage.setItem("loja-last-order-id", order.id);
      } catch {
        business.notify(
          "Pedido registrado. Mantenha esta página aberta para acompanhar.",
        );
      }
      cart.value = [];
      await navigateTo("/pedidos/" + order.id);
    } catch (problem) {
      error.value = (problem as Error).message;
    }
  });
}
</script>
<template>
  <section class="checkout-page">
    <h1>Finalizar compra</h1>
    <p>Compre sem criar conta ou senha. Informe seus dados para este pedido.</p>

    <DemoCustomerRecovery
      v-if="cart.length && !recovery"
      @recovered="
        Object.assign(customer, {
          name: $event.name,
          phone: $event.phone,
          birthday: $event.birthday,
        })
      "
    />
    <section v-if="recovery" class="panel panel-body" role="status">
      <h2>Pedido aguardando confirmação</h2>
      <p>
        Recupere o resultado da tentativa anterior antes de enviar outra compra.
        A mesma chave evita pedido duplicado.
      </p>
      <LoadingButton :loading="isLoading" @click="recover"
        >Recuperar pedido anterior</LoadingButton
      >
    </section>
    <p v-if="recovery && error" role="alert">{{ error }}</p>
    <section v-if="!cart.length && !recovery" class="panel panel-body">
      <h2>Seu carrinho está vazio</h2>
      <NuxtLink to="/" class="button secondary">Escolher produtos</NuxtLink>
    </section>
    <form
      v-else-if="!recovery"
      class="panel panel-body checkout-form"
      @submit.prevent="submit"
    >
      <fieldset :disabled="isLoading">
        <label
          >Nome completo<input
            v-model="customer.name"
            required
            maxlength="120"
            autocomplete="name"
        /></label>
        <label
          >Telefone com DDD<input
            v-model="customer.phone"
            required
            maxlength="20"
            type="tel"
            autocomplete="tel"
        /></label>
        <label
          >Data de aniversário<input
            v-model="customer.birthday"
            required
            type="date"
            :max="today()"
            autocomplete="bday"
        /></label>
        <label
          >Como receber<select v-model="delivery">
            <option v-if="settings.pickupEnabled">Retirada</option>
            <option v-if="settings.deliveryEnabled">Entrega</option>
          </select></label
        >
        <div v-if="delivery === 'Entrega'" class="form-grid">
          <label
            >CEP<input
              v-model="address.zip"
              required
              maxlength="9"
              inputmode="numeric" /></label
          ><label
            >Rua<input v-model="address.street" required maxlength="255"
          /></label>
          <label
            >Número<input
              v-model="address.number"
              required
              maxlength="30" /></label
          ><label
            >Complemento<input v-model="address.extra" maxlength="100"
          /></label>
          <label
            >Bairro<input
              v-model="address.district"
              required
              maxlength="100" /></label
          ><label
            >Cidade<input v-model="address.city" required maxlength="100"
          /></label>
          <label
            >UF<select v-model="address.uf">
              <option
                v-for="region in 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(
                  ' ',
                )"
                :key="region"
              >
                {{ region }}
              </option>
            </select></label
          >
        </div>
        <label
          >Forma de pagamento<select v-model="method">
            <option>PIX</option>
            <option>Cartão</option>
            <option>Boleto</option>
            <option>Dinheiro</option>
            <option>Parcelado</option>
          </select></label
        >
        <label v-if="installmentMethod"
          >Quantidade de parcelas<select v-model.number="count">
            <option
              v-for="rate in state.interestRates"
              :key="rate.id"
              :value="rate.count"
            >
              {{ rate.count }} × · {{ rate.percent }}% de juros
            </option>
          </select></label
        >
        <p
          v-if="installmentMethod && !state.interestRates?.length"
          role="alert"
        >
          A loja precisa configurar as taxas antes de oferecer parcelamento.
        </p>
        <label
          >Cupom (opcional)<input v-model.lazy="coupon" maxlength="30"
        /></label>
        <h2>Resumo do pedido</h2>
        <ul>
          <li v-for="line in cart" :key="line.productId">
            {{
              state.products.find((product) => product.id === line.productId)
                ?.name
            }}
            · {{ line.quantity }} un.
          </li>
        </ul>
        <p v-if="calculating" role="status">Calculando total…</p>
        <OrderSummary v-if="preview" :order="preview" />
        <ul v-if="preview && installmentMethod">
          <li v-for="(installment, index) in preview.schedule" :key="index">
            Parcela {{ index + 1 }}: {{ money(installment.amount) }}
          </li>
        </ul>
        <p>
          O pedido será conferido pela loja antes da baixa de estoque. Pagamento
          combinado com a gestora; não solicitamos dados de cartão.
        </p>
      </fieldset>
      <p v-if="error" role="alert">{{ error }}</p>
      <LoadingButton
        type="submit"
        :loading="isLoading"
        :disabled="calculating || !preview"
        loading-text="Registrando pedido…"
        >Confirmar pedido</LoadingButton
      >
    </form>
  </section>
</template>
<style scoped>
.checkout-page {
  max-width: 760px;
  margin: auto;
}
.checkout-form {
  margin-top: 24px;
}
fieldset {
  display: grid;
  gap: 20px;
  border: 0;
  padding: 0;
  min-width: 0;
}
.checkout-form > button {
  margin-top: 24px;
}
</style>

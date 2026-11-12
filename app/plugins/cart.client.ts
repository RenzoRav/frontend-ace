import { readStoreStorage } from "~/utils/storage";
import type { CartLine } from "~/types";
export default defineNuxtPlugin((nuxt) => {
  const cart = useState<CartLine[]>("store-cart", () => []);
  nuxt.hook("app:mounted", () => {
    try {
      const saved = readStoreStorage(localStorage, "loja-cart-v1");
      if (saved) {
        const value = JSON.parse(saved);
        if (
          Array.isArray(value) &&
          value.every(
            (l) =>
              l &&
              typeof l.productId === "string" &&
              Number.isInteger(l.quantity) &&
              l.quantity > 0,
          )
        )
          cart.value = value;
      }
    } catch {
      useBusiness().notify("O carrinho local foi reiniciado.");
    }
    watch(
      cart,
      (value) => {
        try {
          localStorage.setItem("loja-cart-v1", JSON.stringify(value));
        } catch {
          useBusiness().notify("O carrinho permanece apenas nesta sessão.");
        }
      },
      { deep: true, flush: "sync" },
    );
  });
});

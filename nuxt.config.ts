import tailwindcss from "@tailwindcss/vite";
export default defineNuxtConfig({
  compatibilityDate: "2026-10-05",
  devtools: { enabled: false },
  ssr: false,
  runtimeConfig: { public: { apiBase: "/api/v1", demoMode: false } },
  css: ["~/assets/css/main.css"],
  vite: { plugins: [tailwindcss()] },
  app: {
    head: {
      title: "SA Perfumaria · Loja e administração",
      htmlAttrs: { lang: "pt-BR" },
      meta: [
        {
          name: "description",
          content:
            "SA Perfumaria: catálogo de beleza, área do cliente e painel administrativo.",
        },
      ],
    },
  },
});

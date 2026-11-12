<script setup lang="ts">
const route = useRoute();
const { account, storageError } = useAccount();
const { flow, hydrated, warning, signOut } = useClientFlow();
const links = [
  { to: "/conta", label: "Visão geral" },
  { to: "/conta/pedidos", label: "Meus pedidos" },
  { to: "/conta/enderecos", label: "Meus endereços" },
  { to: "/conta/dados", label: "Meus dados" },
  { to: "/conta/senha", label: "Alterar senha" },
  { to: "/conta/ajuda", label: "Ajuda e atendimento" },
];
</script>
<template>
  <NuxtLayout name="store">
    <section class="client-area">
      <p v-if="storageError" role="alert" class="client-notice">
        {{ storageError }}
      </p>
      <p v-if="warning" role="alert">{{ warning }}</p>
      <p v-if="!hydrated" role="status">Carregando sua conta...</p>
      <section v-else-if="!flow.signedIn" class="client-card">
        <h1>Acesse sua conta</h1>
        <p>
          Acesse sua conta para acompanhar pedidos e manter seus dados
          atualizados.
        </p>
        <NuxtLink
          :to="
            route.path === '/checkout' ? '/entrar?next=/checkout' : '/entrar'
          "
          class="button mt-4"
          >Entrar na minha conta</NuxtLink
        >
      </section>
      <div v-else class="client-shell">
        <aside class="client-nav">
          <div class="client-avatar">{{ account.name.slice(0, 1) }}</div>
          <strong>{{ account.name }}</strong>
          <p>Área do cliente</p>
          <nav aria-label="Área do cliente">
            <NuxtLink
              v-for="link in links"
              :key="link.to"
              :to="link.to"
              :class="{
                selected:
                  link.to === '/conta'
                    ? route.path === link.to
                    : route.path.startsWith(link.to),
              }"
              >{{ link.label }}</NuxtLink
            >
          </nav>
          <NuxtLink to="/" class="button secondary"
            >Continuar comprando</NuxtLink
          >
          <button class="button secondary mt-4" @click="signOut">
            Sair da conta
          </button>
        </aside>
        <main class="client-content"><slot /></main>
      </div>
    </section>
  </NuxtLayout>
</template>
<style>
.client-area {
  max-width: 1200px;
  margin: 32px auto;
  padding: 0 24px 48px;
}
.client-notice {
  padding: 12px 16px;
  background: #f0f0f0;
  color: #545454;
  border-radius: 4px;
  margin-bottom: 22px;
  font-size: 12px;
}
.client-shell {
  display: grid;
  grid-template-columns: 230px minmax(0, 1fr);
  gap: 32px;
}
.client-nav {
  align-self: start;
  background: white;
  border: 1px solid #e4e4e4;
  border-radius: 4px;
  padding: 24px;
}
.client-avatar {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  background: #e6e6e6;
  display: grid;
  place-items: center;
  font-size: 22px;
  margin-bottom: 14px;
}
.client-nav nav {
  display: grid;
  gap: 6px;
  margin: 24px 0;
}
.client-nav nav a {
  padding: 12px;
  border-radius: 4px;
}
.client-nav nav a.selected {
  background: var(--color-brand-50);
  color: var(--color-brand-700);
  font-weight: 600;
}
.client-content {
  min-width: 0;
}
.client-content h1 {
  margin-bottom: 8px;
}
.client-card {
  background: white;
  border: 1px solid #e4e4e4;
  border-radius: 4px;
  padding: 22px;
  margin-top: 20px;
}
.client-card h2 {
  margin-bottom: 12px;
}
.client-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.client-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.client-form {
  display: grid;
  gap: 16px;
  max-width: 680px;
}
.client-form fieldset {
  border: 0;
  padding: 0;
  min-width: 0;
  display: grid;
  gap: 16px;
}
.client-status {
  padding: 12px;
  background: #f0f0f0;
  border-radius: 4px;
  margin-top: 16px;
}
.client-items {
  list-style: none;
  padding: 0;
  margin: 0;
}
.client-items li {
  padding: 14px 0;
  border-bottom: 1px solid #efefef;
}
.store-account-links {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.client-card .badge {
  white-space: normal;
}
@media (max-width: 700px) {
  .client-area {
    padding: 0 16px;
    margin-top: 20px;
  }
  .client-shell {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  .client-nav {
    padding: 18px;
  }
  .client-nav nav {
    grid-template-columns: 1fr 1fr;
    margin: 16px 0;
  }
  .client-grid {
    grid-template-columns: 1fr;
  }
  .store-header {
    flex-wrap: wrap;
    gap: 12px;
  }
  .store-account-links {
    width: 100%;
  }
  .store-account-links .button {
    flex: 1;
  }
  .client-content h1 {
    font-size: 25px;
  }
}
</style>

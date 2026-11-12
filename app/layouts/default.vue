<script setup lang="ts">
import { today, formatDate } from "~/utils/domain";
const { demo } = useStoreMode();
const route = useRoute();
const menuOpen = ref(false);
const { signOut } = useManager();
const navigation = [
  { to: "/admin", label: "Dashboard", icon: "dashboard" },
  { to: "/admin/produtos", label: "Produtos", icon: "products" },
  { to: "/admin/campanhas", label: "Cupons e promoções", icon: "sparkles" },
  { to: "/admin/estoque", label: "Estoque", icon: "inventory" },
  { to: "/admin/clientes", label: "Clientes", icon: "customers" },
  { to: "/admin/vendas", label: "Vendas", icon: "sales" },
  { to: "/admin/pedidos", label: "Pedidos", icon: "orders" },
  { to: "/admin/financeiro", label: "Financeiro", icon: "finance" },
  { to: "/admin/relatorios", label: "Relatórios", icon: "reports" },
  { to: "/admin/auditoria", label: "Auditoria", icon: "orders" },
];
watch(
  () => route.path,
  () => (menuOpen.value = false),
);
</script>
<template>
  <div class="admin-shell">
    <div v-if="menuOpen" class="sidebar-overlay" @click="menuOpen = false" />
    <aside class="sidebar" :class="{ open: menuOpen }">
      <NuxtLink to="/admin" class="site-title">Administração</NuxtLink>
      <div class="workspace">
        <span class="workspace-avatar">SA</span>
        <div>
          <strong>SA Perfumaria</strong><small>Espaço da revendedora</small>
        </div>
        <Icon name="right" :size="16" />
      </div>
      <span class="nav-label">VISÃO DO NEGÓCIO</span>
      <nav>
        <NuxtLink
          v-for="entry in navigation"
          :key="entry.to"
          :to="entry.to"
          :class="{ active: route.path === entry.to }"
          ><Icon :name="entry.icon" /><span>{{ entry.label }}</span
          ><span v-if="entry.icon === 'orders'" class="nav-count">{{
            useBusiness().state.value.orders.filter(
              (order) => order.status === "Novo",
            ).length
          }}</span></NuxtLink
        >
      </nav>
      <div class="sidebar-bottom">
        <div class="store-callout">
          <Icon name="leaf" :size="22" /><strong
            >Sua vitrine está pronta</strong
          >
          <p>Leve seus produtos até suas clientes.</p>
          <NuxtLink to="/"
            >Abrir minha loja <Icon name="external" :size="14"
          /></NuxtLink>
        </div>
        <NuxtLink to="/admin/configuracoes" class="settings-link"
          ><Icon name="settings" />Configurações</NuxtLink
        >
        <div class="profile">
          <span class="profile-avatar">MC</span>
          <div><strong>Marina Costa</strong><small>Revendedora</small></div>
          <button class="text-link" @click="signOut">Sair</button>
        </div>
      </div>
    </aside>
    <div class="main-shell">
      <header class="topbar">
        <div class="flex items-center gap-3">
          <button
            class="mobile-menu icon-button"
            aria-label="Abrir menu"
            @click="menuOpen = !menuOpen"
          >
            <Icon name="menu" /></button
          ><span class="breadcrumb"
            >Meu negócio <Icon name="right" :size="14" /><strong>{{
              navigation.find((entry) => entry.to === route.path)?.label ||
              "Configurações"
            }}</strong></span
          >
        </div>
        <div class="header-right">
          <span class="demo-label">{{ "Área gerencial" }}</span
          ><span class="header-date"
            ><Icon name="calendar" :size="16" />{{ formatDate(today()) }}</span
          ><span class="small-avatar">MC</span>
        </div>
      </header>
      <main class="main-content"><slot /></main>
      <footer class="app-footer">
        <span>SA Perfumaria · Gestão</span><span>{{ "Minha loja" }}</span>
      </footer>
    </div>
  </div>
</template>

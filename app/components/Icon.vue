<script setup lang="ts">
import {
  LoaderCircle,
  LayoutDashboard,
  Package,
  Boxes,
  Users,
  ShoppingBag,
  ClipboardList,
  Wallet,
  ChartNoAxesCombined,
  Flower2,
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Pencil,
  Eye,
  SlidersHorizontal,
  ShoppingCart,
  Trash2,
  Menu,
  ExternalLink,
  Phone,
  Download,
  AlertCircle,
  CalendarDays,
  Sparkles,
  Settings,
  Leaf,
} from "@lucide/vue";
const props = withDefaults(defineProps<{ name: string; size?: number }>(), {
  size: 20,
});
const icons = {
  loading: LoaderCircle,
  dashboard: LayoutDashboard,
  products: Package,
  inventory: Boxes,
  customers: Users,
  sales: ShoppingBag,
  orders: ClipboardList,
  finance: Wallet,
  reports: ChartNoAxesCombined,
  flower: Flower2,
  search: Search,
  plus: Plus,
  up: ArrowUpRight,
  down: ArrowDownRight,
  arrow: ArrowRight,
  right: ChevronRight,
  left: ChevronLeft,
  check: Check,
  close: X,
  edit: Pencil,
  eye: Eye,
  filter: SlidersHorizontal,
  cart: ShoppingCart,
  trash: Trash2,
  menu: Menu,
  external: ExternalLink,
  phone: Phone,
  download: Download,
  alert: AlertCircle,
  calendar: CalendarDays,
  sparkles: Sparkles,
  settings: Settings,
  leaf: Leaf,
};
const selectedIcon = computed(
  () => icons[props.name as keyof typeof icons] || Package,
);
</script>
<template>
  <component
    :is="selectedIcon"
    :size="size"
    :stroke-width="1.7"
    aria-hidden="true"
  />
</template>

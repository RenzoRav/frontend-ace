<script setup lang="ts">
import { today, addMonths, money } from "~/utils/domain";
const { state } = useBusiness();
const months = computed(() =>
  Array.from({ length: 6 }, (_, index) => {
    const date = addMonths(today(), index - 5);
    return {
      name: new Date(date + "T12:00:00")
        .toLocaleDateString("pt-BR", { month: "short" })
        .replace(".", ""),
      total: state.value.sales
        .filter((sale) => sale.date.slice(0, 7) === date.slice(0, 7))
        .reduce((sum, sale) => sum + sale.total, 0),
    };
  }),
);
const maximum = computed(
  () => Math.max(...months.value.map((month) => month.total), 1) * 1.15,
);
const points = computed(() =>
  months.value
    .map(
      (month, index) =>
        45 + index * 96 + "," + (170 - (month.total / maximum.value) * 145),
    )
    .join(" "),
);
</script>
<template>
  <div class="chart-container">
    <svg
      viewBox="0 0 550 190"
      role="img"
      aria-label="Evolução do faturamento nos últimos seis meses"
    >
      <defs>
        <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#c0c0c0" stop-opacity=".4" />
          <stop offset="100%" stop-color="#c0c0c0" stop-opacity="0" />
        </linearGradient>
      </defs>
      <g v-for="fraction in [0, 0.33, 0.66, 1]" :key="fraction">
        <line
          x1="45"
          :y1="170 - fraction * 145"
          x2="525"
          :y2="170 - fraction * 145"
          stroke="#eeeeee"
          stroke-dasharray="4 5"
        />
        <text x="0" :y="174 - fraction * 145" font-size="9" fill="#a3a3a3">
          {{ Math.round((maximum * fraction) / 1000) }} mil
        </text>
      </g>
      <polygon
        :points="'45,170 ' + points + ' 525,170'"
        fill="url(#chart-fill)"
      />
      <polyline
        :points="points"
        fill="none"
        stroke="#858585"
        stroke-width="2.5"
        stroke-linejoin="round"
      />
      <circle
        v-for="(month, index) in months"
        :key="month.name"
        :cx="45 + index * 96"
        :cy="170 - (month.total / maximum) * 145"
        r="4"
        fill="#858585"
        stroke="white"
        stroke-width="2"
      >
        <title>{{ month.name }}: {{ money(month.total) }}</title>
      </circle>
    </svg>
  </div>
  <div class="chart-months">
    <span v-for="month in months" :key="month.name">{{ month.name }}</span>
  </div>
</template>

<script setup lang="ts">
const { state } = useBusiness();
const search = ref("");
const logs = computed(() =>
  (state.value.auditLogs || []).filter((l) =>
    (l.action + l.entity + l.entityId)
      .toLowerCase()
      .includes(search.value.toLowerCase()),
  ),
);
</script>
<template>
  <div>
    <div class="page-heading">
      <div>
        <h1>Auditoria</h1>
        <p>Consulte o histórico de alterações e operações administrativas.</p>
      </div>
    </div>
    <section class="panel">
      <div class="toolbar">
        <label>Pesquisar auditoria<input v-model="search" /></label>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Gestora</th>
              <th>Ação</th>
              <th>Entidade</th>
              <th>Identificador</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in logs" :key="l.id">
              <td>
                {{
                  new Date(l.date).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })
                }}
              </td>
              <td>
                {{
                  state.managers?.find((m) => m.id === l.actorId)?.name ||
                  l.actorId
                }}
              </td>
              <td>{{ l.action }}</td>
              <td>{{ l.entity }}</td>
              <td>{{ l.entityId }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <EmptyState
        v-if="!logs.length"
        title="Nenhuma ação administrativa registrada"
      />
    </section>
  </div>
</template>

import { readStoreStorage } from "~/utils/storage";
import { brands, categories } from "~/data/mock";
import {
  backupLegacy,
  migrateState,
  persistedState,
} from "~/utils/commerce/migration";
export default defineNuxtPlugin(() => {
  if (!useStoreMode().demo) return;
  const { state, notify } = useBusiness();
  let writable = true;
  try {
    readStoreStorage(localStorage, "loja-backup-v1");
    const current = readStoreStorage(localStorage, "loja-v2"),
      legacy = readStoreStorage(localStorage, "loja-v1");
    if (current) state.value = migrateState(JSON.parse(current));
    else if (legacy) {
      const migrated = migrateState(
        JSON.parse(legacy),
        JSON.parse(readStoreStorage(localStorage, "loja-flow-v1") || "null"),
        { brands, categories },
      );
      backupLegacy(localStorage);
      localStorage.setItem("loja-v2", JSON.stringify(persistedState(migrated)));
      state.value = migrated;
    }
  } catch (problem) {
    writable = false;
    notify("Originais preservados. " + (problem as Error).message);
  }
  watch(
    state,
    (business) => {
      if (!writable) return;
      try {
        readStoreStorage(localStorage, "loja-backup-v1");
        localStorage.setItem(
          "loja-v2",
          JSON.stringify(persistedState(business)),
        );
      } catch {
        notify(
          "Alterações nesta sessão; o navegador não permitiu salvar os dados.",
        );
      }
    },
    { deep: true },
  );
});

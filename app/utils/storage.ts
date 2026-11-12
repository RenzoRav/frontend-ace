/** Le exclusivamente a chave atual solicitada, sem namespaces de marcas anteriores. */
export function readStoreStorage(
  storage: Pick<Storage, "getItem">,
  key: string,
): string | null {
  return storage.getItem(key);
}
/** Mantem o estado encerrado apos logout ou reset. */
export function clearStoreStorage(
  storage: Pick<Storage, "setItem">,
  key: string,
): void {
  storage.setItem(key, "");
}

export interface PendingCheckout {
  key: string;
  payload: string;
}
type StorageAccess = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const slot = "loja-pending-checkout";
export function createPendingCheckout(storage: StorageAccess) {
  function read(): PendingCheckout | null {
    const value = storage.getItem(slot);
    if (!value) return null;
    const pending = JSON.parse(value);
    if (
      typeof pending.key !== "string" ||
      !/^[a-f0-9-]{36}$/i.test(pending.key) ||
      typeof pending.payload !== "string"
    )
      throw Error(
        "Pedido pendente inválido. Entre em contato com a loja antes de repetir a compra.",
      );
    return pending;
  }
  function prepare(payload: string): PendingCheckout {
    const previous = read();
    if (previous) {
      if (previous.payload !== payload)
        throw Error(
          "Existe um pedido pendente de confirmação. Recupere o pedido anterior antes de alterar a compra.",
        );
      return previous;
    }
    const pending = { key: crypto.randomUUID(), payload };
    try {
      storage.setItem(slot, JSON.stringify(pending));
    } catch {
      throw Error(
        "Ative o armazenamento desta aba para preservar o pedido antes do envio.",
      );
    }
    return pending;
  }
  return { read, prepare, complete: () => storage.removeItem(slot) };
}

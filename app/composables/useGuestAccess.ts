export function useGuestAccess() {
  const tokens = useState<Record<string, string>>(
    "guest-order-access",
    () => ({}),
  );
  const last = useState("guest-last-order", () => "");
  function remember(id: string, token?: string) {
    last.value = id;
    if (token) tokens.value[id] = token;
    try {
      sessionStorage.setItem("loja-last-order-id", id);
      if (token) sessionStorage.setItem("loja-order-token-" + id, token);
    } catch {}
  }
  function token(id: string) {
    try {
      return (
        tokens.value[id] || sessionStorage.getItem("loja-order-token-" + id)
      );
    } catch {
      return tokens.value[id];
    }
  }
  function lastId() {
    try {
      return last.value || sessionStorage.getItem("loja-last-order-id");
    } catch {
      return last.value;
    }
  }
  return { remember, token, lastId };
}

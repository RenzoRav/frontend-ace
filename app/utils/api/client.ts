export interface ApiSession {
  accessToken: string;
  role: string;
  accountId: string;
  name: string;
}
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export function createApiClient(
  baseUrl: string,
  transport: typeof fetch = fetch,
) {
  let session: ApiSession | null = null;
  let epoch = 0;
  let loggedOut = false;
  const channel =
    typeof window !== "undefined" && typeof BroadcastChannel !== "undefined"
      ? new BroadcastChannel("loja-session-events")
      : null;
  function invalidate() {
    epoch++;
    loggedOut = true;
    setSession(null);
  }
  if (channel)
    channel.onmessage = (event) => {
      if (event.data === "logout") invalidate();
    };
  async function withSessionLock<T>(action: () => Promise<T>): Promise<T> {
    return typeof navigator !== "undefined" && navigator.locks
      ? navigator.locks.request("loja-manager-refresh", action)
      : action();
  }
  let refreshing: Promise<ApiSession> | null = null;
  const listeners = new Set<(value: ApiSession | null) => void>();
  function setSession(value: ApiSession | null) {
    session = value;
    listeners.forEach((listener) => listener(value));
  }
  async function send<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    if (options.body) headers.set("Content-Type", "application/json");
    if (path.startsWith("/manager/") && session)
      headers.set("Authorization", `Bearer ${session.accessToken}`);
    let response: Response;
    try {
      response = await transport(baseUrl.replace(/\/$/, "") + path, {
        ...options,
        headers,
        credentials: "include",
        cache: "no-store",
        signal: options.signal ?? AbortSignal.timeout(15000),
      });
    } catch {
      throw new ApiError(
        0,
        "Falha de conexão. Confira sua internet e tente novamente.",
      );
    }
    if (!response.ok) {
      const wait = response.headers.get("Retry-After");
      const messages: Record<number, string> = {
        401: "Sessão expirada ou credenciais inválidas.",
        403: "Acesso negado.",
        404: "Registro não encontrado.",
        409: "Os dados mudaram ou já foram utilizados. Atualize e confira antes de tentar novamente.",
        429: `Muitas tentativas. Aguarde ${/^\d+$/.test(wait || "") ? wait : "alguns"} segundos.`,
        503: "Serviço temporariamente indisponível. Tente novamente.",
      };
      throw new ApiError(
        response.status,
        messages[response.status] ||
          (response.status === 400
            ? "Confira os campos, estoque, cupom e taxas informados."
            : "O serviço encontrou um erro. Tente novamente."),
      );
    }
    if (
      response.status === 204 ||
      response.headers.get("content-length") === "0"
    )
      return undefined as T;
    const text = await response.text();
    try {
      return text ? (JSON.parse(text) as T) : (undefined as T);
    } catch {
      throw new ApiError(
        502,
        "Resposta inesperada do serviço. Confira a configuração da API.",
      );
    }
  }
  async function refresh(): Promise<ApiSession> {
    if (loggedOut)
      throw new ApiError(401, "Sessão encerrada. Entre novamente.");
    const requestEpoch = epoch;
    if (!refreshing) {
      const renew = async () => {
        if (loggedOut || requestEpoch !== epoch)
          throw new ApiError(401, "Sessão encerrada. Entre novamente.");
        const value = await send<ApiSession>("/auth/manager/refresh", {
          method: "POST",
        });
        if (value.role !== "MANAGER")
          throw new ApiError(403, "Acesso gerencial necessário.");
        if (loggedOut || requestEpoch !== epoch)
          throw new ApiError(401, "Sessão encerrada. Entre novamente.");
        setSession(value);
        return value;
      };
      refreshing = withSessionLock(renew)
        .catch((error) => {
          setSession(null);
          throw error;
        })
        .finally(() => {
          refreshing = null;
        });
    }
    return refreshing!;
  }
  return {
    get session() {
      return session;
    },
    subscribe(listener: (value: ApiSession | null) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async login(email: string, password: string) {
      const requestEpoch = ++epoch;
      loggedOut = false;
      const value = await send<ApiSession>("/auth/manager/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (value.role !== "MANAGER")
        throw new ApiError(403, "Acesso gerencial necessário.");
      if (requestEpoch !== epoch || loggedOut)
        throw new ApiError(401, "Sessão encerrada. Entre novamente.");
      setSession(value);
      return value;
    },
    refresh,
    async logout() {
      invalidate();
      channel?.postMessage("logout");
      try {
        await refreshing?.catch(() => null);
        await withSessionLock(() =>
          send("/auth/manager/logout", { method: "POST" }),
        );
      } finally {
        setSession(null);
      }
    },
    async request<T>(path: string, options: RequestInit = {}): Promise<T> {
      try {
        return await send<T>(path, options);
      } catch (error) {
        if (
          !(error instanceof ApiError) ||
          error.status !== 401 ||
          !path.startsWith("/manager/")
        )
          throw error;
        await refresh();
        return send<T>(path, options);
      }
    },
  };
}

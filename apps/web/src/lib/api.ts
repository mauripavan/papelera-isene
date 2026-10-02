const BASE = import.meta.env.VITE_API_URL ?? '';
const TOKEN_KEY = 'papelera.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

/** Se dispara cuando la API responde 401: el AuthProvider escucha y cierra la sesión. */
export const UNAUTHORIZED_EVENT = 'papelera:unauthorized';

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const token = tokenStore.get();
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      ...(json !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  if (res.status === 401 && !path.startsWith('/auth/login')) {
    tokenStore.clear();
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const details = body.details;
    const extra = Array.isArray(details)
      ? ` (${details.map((d: { path: string; message: string }) => `${d.path}: ${d.message}`).join(', ')})`
      : '';
    throw new ApiError(res.status, (body.error ?? `Error ${res.status}`) + extra, details);
  }
  return body as T;
}

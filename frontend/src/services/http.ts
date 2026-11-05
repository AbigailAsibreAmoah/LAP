// Thin HTTP client. Presentation components never call fetch directly — they go
// through `services/api.ts`, which decides between the backend and the demo adapter.

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';
const MODE = (import.meta.env.VITE_DATA_MODE as string | undefined) ?? 'auto';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export async function request<T>(path: string, opts: { method?: string; body?: unknown; userId?: string } = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.userId ? { 'x-demo-user': opts.userId } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data?.error?.code ?? 'http_error', data?.error?.message ?? res.statusText);
  }
  return data as T;
}

/** Multipart upload (media files). */
export async function upload<T>(path: string, form: FormData, userId: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers: { 'x-demo-user': userId }, body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data?.error?.code ?? 'http_error', data?.error?.message ?? res.statusText);
  return data as T;
}

let detected: Promise<boolean> | null = null;

/** Forces the offline demo adapter for the rest of the session. */
export function markApiUnavailable() {
  detected = Promise.resolve(false);
}

/** Resolves true when the backend is reachable. Cached for the session. */
export function detectApi(): Promise<boolean> {
  if (MODE === 'demo') return Promise.resolve(false);
  detected ??= (async () => {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 1500);
      const res = await fetch(`${BASE}/health`, { signal: ctrl.signal });
      clearTimeout(timer);
      return res.ok && (await res.json()).status === 'ok';
    } catch {
      return false;
    }
  })();
  return detected;
}

import { API_URL, REQUEST_TIMEOUT_MS } from './config';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: string[],
  ) {
    super(message);
  }
}

type SessionHooks = {
  getAccessToken: () => string | null;
  /** Called once when a request gets 401; must return a fresh access token or null. */
  refresh: () => Promise<string | null>;
  onSessionExpired: () => void;
};

let hooks: SessionHooks | null = null;
let refreshing: Promise<string | null> | null = null;

export function configureSession(h: SessionHooks) {
  hooks = h;
}

type Options = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  idempotencyKey?: string;
  query?: Record<string, string | number | undefined>;
};

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const res = await send(path, opts, opts.auth !== false ? hooks?.getAccessToken() ?? null : null);
  if (res.status === 401 && opts.auth !== false && hooks) {
    // Single-flight refresh so parallel 401s do not burn the rotating refresh token several times.
    refreshing = refreshing ?? hooks.refresh().finally(() => (refreshing = null));
    const token = await refreshing;
    if (!token) {
      hooks.onSessionExpired();
      throw new ApiError(401, 'SESSION_EXPIRED', 'Your session has expired. Please sign in again.');
    }
    return parse<T>(await send(path, opts, token));
  }
  return parse<T>(res);
}

async function send(path: string, opts: Options, token: string | null): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;
  let url = API_URL + path;
  if (opts.query) {
    const qs = Object.entries(opts.query)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (qs) url += `?${qs}`;
  }
  try {
    return await fetch(url, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: controller.signal,
      credentials: 'omit',
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'No internet connection or the server is unreachable.');
  } finally {
    clearTimeout(timer);
  }
}

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const d = (data ?? {}) as { code?: string; message?: string; fields?: string[] };
    throw new ApiError(res.status, d.code ?? 'ERROR', d.message ?? 'Something went wrong', d.fields);
  }
  return data as T;
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return 'Something went wrong. Please try again.';
}

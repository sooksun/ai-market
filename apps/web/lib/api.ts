const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiOptions extends RequestInit {
  cookie?: string;
}

export async function apiFetch<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { cookie, headers, ...rest } = opts;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...(headers ?? {}),
    },
    cache: 'no-store',
  });

  let body: unknown = null;
  if (res.status !== 204) {
    try {
      body = await res.json();
    } catch {
      // ignore
    }
  }

  if (!res.ok) {
    const err = body as { error?: { code?: string; message?: string; details?: unknown } } | null;
    throw new ApiError(
      res.status,
      err?.error?.code ?? 'UNKNOWN',
      err?.error?.message ?? `HTTP ${res.status}`,
      err?.error?.details,
    );
  }

  if (body && typeof body === 'object' && 'data' in (body as Record<string, unknown>)) {
    return (body as { data: T }).data;
  }
  return body as T;
}

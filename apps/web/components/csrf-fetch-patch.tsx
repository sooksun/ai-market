'use client';

import { useEffect } from 'react';

const CSRF_COOKIE = 'aim_csrf';
const CSRF_HEADER = 'X-CSRF-Token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const PATCHED_FLAG = '__aimCsrfPatched';

function readCsrfCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${CSRF_COOKIE}=([^;]+)`),
  );
  return match ? decodeURIComponent(match[1]!) : null;
}

/**
 * Patches `window.fetch` once on mount so every non-safe request automatically
 * includes the CSRF double-submit header. Existing call sites do not need
 * changes — the wrapper inspects the request method and only attaches the
 * header for POST/PUT/PATCH/DELETE.
 */
export function CsrfFetchPatch() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as Window & { [PATCHED_FLAG]?: boolean };
    if (w[PATCHED_FLAG]) return;
    w[PATCHED_FLAG] = true;

    const originalFetch = window.fetch.bind(window);
    window.fetch = async function patched(
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      const method = (init?.method ?? (input instanceof Request ? input.method : 'GET'))
        .toString()
        .toUpperCase();
      if (SAFE_METHODS.has(method)) {
        return originalFetch(input, init);
      }
      const token = readCsrfCookie();
      if (!token) return originalFetch(input, init);

      // Compose new headers without mutating caller's object.
      const headers = new Headers(init?.headers ?? {});
      if (!headers.has(CSRF_HEADER)) headers.set(CSRF_HEADER, token);
      return originalFetch(input, { ...(init ?? {}), headers });
    };
  }, []);
  return null;
}

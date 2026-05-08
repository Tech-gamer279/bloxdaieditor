import { useAuth } from "@clerk/react";

const BASE = "/api";

export async function apiFetch(
  path: string,
  options?: RequestInit & { token?: string | null },
): Promise<unknown> {
  const { token, ...restOptions } = options ?? {};
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(restOptions.headers ?? {}),
    },
    ...restOptions,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

/** React hook: returns an authenticated version of apiFetch */
export function useApi() {
  const { getToken } = useAuth();
  return async (path: string, options?: RequestInit) => {
    const token = await getToken();
    return apiFetch(path, { ...options, token });
  };
}

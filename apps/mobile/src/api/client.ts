import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

/** Same REST contract as the web app (see docs/API.md). */
export const API_URL: string = (Constants.expoConfig?.extra?.apiUrl as string) ?? "http://10.0.2.2:3000";
const TOKEN_KEY = "updkp_token";

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}
export async function setToken(token: string | null) {
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const token = await getToken();
  const { json, headers, ...rest } = init;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      ...(json !== undefined ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(headers as Record<string, string> | undefined),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.success) throw new ApiError(payload?.error?.code ?? "REQUEST_FAILED", payload?.error?.message ?? `Request failed (${res.status})`, res.status);
  return payload.data as T;
}

export function qs(params: Record<string, string | number | boolean | undefined>) {
  const sp = Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return sp.length ? `?${sp.join("&")}` : "";
}

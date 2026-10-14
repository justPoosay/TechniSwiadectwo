import { ApiError, errorFromResponse, networkError } from "./errors";

// Browser API client. All calls go to the same-origin /api proxy, so the HttpOnly
// session cookie is attached by the browser; nothing auth-related is kept in JS
// memory or localStorage. The only cookie read here is the (non-secret) CSRF token.

const API_PREFIX = "/api";
const CSRF_COOKIE = "csrftoken";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

type QueryValue = string | number | boolean | null | undefined;

export type ApiRequestOptions = Omit<RequestInit, "body" | "credentials"> & {
  body?: unknown;
  query?: Record<string, QueryValue>;
};

export function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  for (const part of document.cookie.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function buildApiUrl(path: string, query?: Record<string, QueryValue>): string {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error(`API path must be relative to ${API_PREFIX}, got "${path}"`);
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null) params.append(key, String(value));
  }
  const search = params.toString();
  return `${API_PREFIX}${path}${search ? `?${search}` : ""}`;
}

async function ensureCsrfToken(): Promise<string> {
  const existing = readCookie(CSRF_COOKIE);
  if (existing) return existing;

  try {
    await fetch(buildApiUrl("/auth/csrf/"), { credentials: "same-origin", cache: "no-store" });
  } catch {
    throw networkError();
  }
  const token = readCookie(CSRF_COOKIE);
  if (!token) {
    throw new ApiError(
      0,
      "Nie udało się zabezpieczyć żądania. Odśwież stronę.",
      "csrf_unavailable"
    );
  }
  return token;
}

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, query, headers: extraHeaders, method = "GET", ...init } = options;
  const upperMethod = method.toUpperCase();
  const headers = new Headers(extraHeaders);
  headers.set("Accept", "application/json");

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers.set("Content-Type", "application/json");
    payload = JSON.stringify(body);
  }

  if (!SAFE_METHODS.has(upperMethod)) {
    // Read on every call: Django rotates the token on login.
    headers.set("X-CSRFToken", await ensureCsrfToken());
  }

  let response: Response;
  try {
    response = await fetch(buildApiUrl(path, query), {
      ...init,
      method: upperMethod,
      headers,
      body: payload,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw networkError();
  }

  if (!response.ok) {
    throw await errorFromResponse(response);
  }
  if (response.status === 204 || upperMethod === "HEAD") {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, method: "DELETE" }),
};

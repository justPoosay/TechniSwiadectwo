import { ApiError, errorFromResponse, networkError } from "./errors";
import type { paths } from "./schema";
import type { CallArgs, HttpMethod, Operation, PathsWith, ResponseData } from "./types";

// Browser API client. All calls go to the same-origin /api proxy, so the HttpOnly
// session cookie is attached by the browser; nothing auth-related is kept in JS
// memory or localStorage. The only cookie read here is the (non-secret) CSRF token.

const CSRF_COOKIE = "csrftoken";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

type QueryValue = string | number | boolean | null | undefined;

export type ApiRequestOptions = Omit<RequestInit, "body" | "credentials"> & {
  body?: unknown;
  query?: Record<string, QueryValue>;
  /** Sent as X-School-ID: the school the request is about. */
  schoolId?: string;
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
  if (!path.startsWith("/api/")) {
    throw new Error(`API path must start with "/api/", got "${path}"`);
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null) params.append(key, String(value));
  }
  const search = params.toString();
  return `${path}${search ? `?${search}` : ""}`;
}

/** "/api/audit-logs/{id}/" + {id: "x"} -> "/api/audit-logs/x/" */
export function fillPath(template: string, params: Record<string, unknown> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = params[name];
    if (value === undefined || value === null || value === "") {
      throw new Error(`Missing path parameter "${name}" for ${template}`);
    }
    return encodeURIComponent(String(value));
  });
}

async function ensureCsrfToken(): Promise<string> {
  const existing = readCookie(CSRF_COOKIE);
  if (existing) return existing;

  try {
    await fetch("/api/auth/csrf/", { credentials: "same-origin", cache: "no-store" });
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

/** Untyped low-level request. Prefer the typed `api` below. */
export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, query, schoolId, headers: extraHeaders, method = "GET", ...init } = options;
  const upperMethod = method.toUpperCase();
  const headers = new Headers(extraHeaders);
  headers.set("Accept", "application/json");
  if (schoolId) headers.set("X-School-ID", schoolId);

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

type RuntimeOptions = {
  path?: Record<string, unknown>;
  query?: Record<string, QueryValue>;
  body?: unknown;
  schoolId?: string;
  signal?: AbortSignal;
  headers?: HeadersInit;
};

function method<M extends HttpMethod>(name: M) {
  return <P extends PathsWith<M>>(
    path: P,
    ...[options]: CallArgs<Operation<P, M>>
  ): Promise<ResponseData<Operation<P, M>>> => {
    const { path: pathParams, ...rest } = (options ?? {}) as RuntimeOptions;
    return apiFetch(fillPath(path, pathParams), { ...rest, method: name.toUpperCase() });
  };
}

/**
 * Typed client generated from the OpenAPI contract: paths, parameters, request
 * bodies and responses are checked against docs/api/openapi.yaml.
 *
 *   const user = await api.get("/api/auth/me/");
 *   const page = await api.get("/api/audit-logs/", { schoolId, query: { page: 2 } });
 *   await api.post("/api/auth/login/", { body: { email, password } });
 */
export const api = {
  get: method("get"),
  post: method("post"),
  put: method("put"),
  patch: method("patch"),
  delete: method("delete"),
};

export type ApiPath = keyof paths;

// Server-side reverse proxy: browser -> Next.js (/api/*) -> Django (BACKEND_URL/api/*).
// The browser only ever talks to its own origin, so session and CSRF cookies stay
// first-party and the Django URL is never exposed to client code.

export const BACKEND_TIMEOUT_MS = 30_000;

// Allowlist: only headers Django needs. Anything else the client sends is dropped.
const FORWARDED_REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "content-type",
  "cookie",
  "if-match",
  "if-none-match",
  "origin",
  "referer",
  "user-agent",
  "x-csrftoken",
  "x-forwarded-for",
];

const DROPPED_RESPONSE_HEADERS = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  // fetch() already decompressed the body, so these would no longer be true.
  "content-encoding",
  "content-length",
  // Prevents the browser's native Basic auth dialog.
  "www-authenticate",
  "set-cookie",
]);

export function getBackendUrl(): string {
  return (process.env.BACKEND_URL ?? "http://localhost:8000").replace(/\/+$/, "");
}

export function proxyErrorResponse(status: number, code: string, detail: string): Response {
  return Response.json({ detail, code }, { status, headers: { "cache-control": "no-store" } });
}

function buildUpstreamHeaders(request: Request, incoming: URL): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  headers.set("x-forwarded-proto", incoming.protocol.replace(":", ""));
  return headers;
}

function buildClientHeaders(upstream: Response, backendUrl: string): Headers {
  const headers = new Headers();
  upstream.headers.forEach((value, name) => {
    if (!DROPPED_RESPONSE_HEADERS.has(name)) headers.set(name, value);
  });
  // forEach() joins multiple Set-Cookie headers into one, which breaks them.
  for (const cookie of upstream.headers.getSetCookie()) {
    headers.append("set-cookie", cookie);
  }
  // Never leak the internal backend address through redirects.
  const location = headers.get("location");
  if (location?.startsWith(backendUrl)) {
    headers.set("location", location.slice(backendUrl.length) || "/");
  }
  return headers;
}

export async function proxyToBackend(
  request: Request,
  backendUrl: string = getBackendUrl(),
  fetchImpl: typeof fetch = fetch
): Promise<Response> {
  const incoming = new URL(request.url);
  // pathname keeps the trailing slash Django's URLs require.
  const target = `${backendUrl}${incoming.pathname}${incoming.search}`;
  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  let upstream: Response;
  try {
    upstream = await fetchImpl(target, {
      method: request.method,
      headers: buildUpstreamHeaders(request, incoming),
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return proxyErrorResponse(
        504,
        "backend_timeout",
        "Serwer nie odpowiedział na czas. Spróbuj ponownie."
      );
    }
    console.error(`[api-proxy] ${request.method} ${incoming.pathname} failed:`, error);
    return proxyErrorResponse(
      502,
      "backend_unavailable",
      "Serwer jest chwilowo niedostępny. Spróbuj ponownie za chwilę."
    );
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: buildClientHeaders(upstream, backendUrl),
  });
}

// @vitest-environment node
import { describe, expect, test, vi } from "vitest";
import { proxyToBackend } from "../proxy";

const BACKEND = "http://backend:8000";

function mockFetch(response: Response | Error) {
  return vi.fn<typeof fetch>(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
}

describe("proxyToBackend", () => {
  test("forwards method, path with trailing slash, query and body", async () => {
    const fetchImpl = mockFetch(Response.json({ ok: true }));
    const request = new Request("http://localhost:3000/api/auth/login/?next=%2Fpanel", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@example.com" }),
    });

    const response = await proxyToBackend(request, BACKEND, fetchImpl);

    expect(response.status).toBe(200);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("http://backend:8000/api/auth/login/?next=%2Fpanel");
    expect(init?.method).toBe("POST");
    expect(new TextDecoder().decode(init?.body as ArrayBuffer)).toBe('{"email":"a@example.com"}');
    expect(init?.redirect).toBe("manual");
  });

  test("forwards only allowlisted request headers", async () => {
    const fetchImpl = mockFetch(new Response(null, { status: 204 }));
    const request = new Request("http://localhost:3000/api/auth/logout/", {
      method: "POST",
      headers: {
        cookie: "sessionid=abc; csrftoken=xyz",
        "x-csrftoken": "xyz",
        "x-school-id": "school-1",
        origin: "http://localhost:3000",
        authorization: "Basic c2VjcmV0",
        "x-custom": "nope",
      },
    });

    await proxyToBackend(request, BACKEND, fetchImpl);

    const headers = fetchImpl.mock.calls[0][1]?.headers as Headers;
    expect(headers.get("cookie")).toBe("sessionid=abc; csrftoken=xyz");
    expect(headers.get("x-csrftoken")).toBe("xyz");
    expect(headers.get("x-school-id")).toBe("school-1");
    expect(headers.get("origin")).toBe("http://localhost:3000");
    expect(headers.get("x-forwarded-proto")).toBe("http");
    expect(headers.get("authorization")).toBeNull();
    expect(headers.get("x-custom")).toBeNull();
  });

  test("does not send a body for GET requests", async () => {
    const fetchImpl = mockFetch(Response.json({}));

    await proxyToBackend(new Request("http://localhost:3000/api/auth/me/"), BACKEND, fetchImpl);

    expect(fetchImpl.mock.calls[0][1]?.body).toBeUndefined();
  });

  test("passes every Set-Cookie header through separately", async () => {
    const upstreamHeaders = new Headers();
    upstreamHeaders.append("set-cookie", "csrftoken=new; Path=/; SameSite=Lax");
    upstreamHeaders.append("set-cookie", "sessionid=s1; HttpOnly; Path=/; SameSite=Lax");
    const fetchImpl = mockFetch(new Response("{}", { status: 200, headers: upstreamHeaders }));

    const response = await proxyToBackend(
      new Request("http://localhost:3000/api/auth/login/", { method: "POST" }),
      BACKEND,
      fetchImpl
    );

    expect(response.headers.getSetCookie()).toEqual([
      "csrftoken=new; Path=/; SameSite=Lax",
      "sessionid=s1; HttpOnly; Path=/; SameSite=Lax",
    ]);
  });

  test("keeps the backend status and strips unsafe response headers", async () => {
    const fetchImpl = mockFetch(
      new Response('{"detail":"x"}', {
        status: 401,
        headers: {
          "content-type": "application/json",
          "www-authenticate": 'Session realm="api"',
          "content-encoding": "gzip",
        },
      })
    );

    const response = await proxyToBackend(
      new Request("http://localhost:3000/api/auth/me/"),
      BACKEND,
      fetchImpl
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(response.headers.get("www-authenticate")).toBeNull();
    expect(response.headers.get("content-encoding")).toBeNull();
    expect(await response.json()).toEqual({ detail: "x" });
  });

  test("does not leak the internal backend address in redirects", async () => {
    const fetchImpl = mockFetch(
      new Response(null, { status: 301, headers: { location: `${BACKEND}/api/students/` } })
    );

    const response = await proxyToBackend(
      new Request("http://localhost:3000/api/students"),
      BACKEND,
      fetchImpl
    );

    expect(response.headers.get("location")).toBe("/api/students/");
  });

  test("returns 502 with a JSON error when the backend is unreachable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchImpl = mockFetch(new TypeError("fetch failed"));

    const response = await proxyToBackend(
      new Request("http://localhost:3000/api/auth/me/"),
      BACKEND,
      fetchImpl
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ code: "backend_unavailable" });
  });

  test("returns 504 when the backend times out", async () => {
    const fetchImpl = mockFetch(new DOMException("timed out", "TimeoutError"));

    const response = await proxyToBackend(
      new Request("http://localhost:3000/api/auth/me/"),
      BACKEND,
      fetchImpl
    );

    expect(response.status).toBe(504);
    expect(await response.json()).toMatchObject({ code: "backend_timeout" });
  });
});

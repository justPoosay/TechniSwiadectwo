import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, buildApiUrl } from "../client";
import { ApiError } from "../errors";

const fetchMock = vi.fn<typeof fetch>();

function clearCookies() {
  for (const part of document.cookie.split(";")) {
    const name = part.split("=")[0].trim();
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
}

beforeEach(() => {
  clearCookies();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buildApiUrl", () => {
  test("prefixes /api and appends defined query params", () => {
    expect(buildApiUrl("/students/", { search: "Nowak", page: 2, school: undefined })).toBe(
      "/api/students/?search=Nowak&page=2"
    );
  });

  test("rejects absolute and protocol-relative URLs", () => {
    expect(() => buildApiUrl("https://evil.example/api/")).toThrow();
    expect(() => buildApiUrl("//evil.example/api/")).toThrow();
  });
});

describe("api client", () => {
  test("GET sends same-origin credentials and no CSRF header", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ email: "a@example.com" }));

    const user = await api.get<{ email: string }>("/auth/me/");

    expect(user.email).toBe("a@example.com");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/me/");
    expect(init?.credentials).toBe("same-origin");
    expect((init?.headers as Headers).has("X-CSRFToken")).toBe(false);
  });

  test("POST uses the CSRF token from the cookie", async () => {
    document.cookie = "csrftoken=token123; path=/";
    fetchMock.mockResolvedValueOnce(Response.json({ detail: "ok" }));

    await api.post("/auth/logout/");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const headers = fetchMock.mock.calls[0][1]?.headers as Headers;
    expect(headers.get("X-CSRFToken")).toBe("token123");
  });

  test("POST fetches a CSRF token first when the cookie is missing", async () => {
    fetchMock.mockImplementationOnce(async () => {
      document.cookie = "csrftoken=fresh; path=/";
      return new Response(null, { status: 204 });
    });
    fetchMock.mockResolvedValueOnce(Response.json({ id: 1 }));

    await api.post("/auth/login/", { email: "a@example.com", password: "x" });

    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/csrf/");
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("/api/auth/login/");
    expect((init?.headers as Headers).get("X-CSRFToken")).toBe("fresh");
    expect((init?.headers as Headers).get("Content-Type")).toBe("application/json");
    expect(init?.body).toBe('{"email":"a@example.com","password":"x"}');
  });

  test("throws ApiError with field errors for 400 responses", async () => {
    document.cookie = "csrftoken=t; path=/";
    fetchMock.mockResolvedValueOnce(
      Response.json({ email: ["Wpisz poprawny adres e-mail."] }, { status: 400 })
    );

    const error = await api.post("/auth/login/", {}).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).fieldErrors.email).toEqual(["Wpisz poprawny adres e-mail."]);
  });

  test("throws a 401 ApiError when the session is missing", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ detail: "Nie podano danych uwierzytelniających." }, { status: 401 })
    );

    const error = (await api.get("/auth/me/").catch((e: unknown) => e)) as ApiError;

    expect(error.isUnauthenticated).toBe(true);
  });

  test("turns network failures into a network_error ApiError", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const error = (await api.get("/auth/me/").catch((e: unknown) => e)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe("network_error");
    expect(error.status).toBe(0);
  });

  test("returns undefined for 204 responses", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(api.get("/auth/csrf/")).resolves.toBeUndefined();
  });
});

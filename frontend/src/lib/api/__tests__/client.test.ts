import { afterEach, beforeEach, describe, expect, expectTypeOf, test, vi } from "vitest";
import { api, buildApiUrl, fillPath } from "../client";
import { ApiError } from "../errors";
import type { ApiSchema, Operation, PathsWith, ResponseData } from "../types";

const fetchMock = vi.fn<typeof fetch>();
const SCHOOL_ID = "6f1c2a8e-0000-4000-8000-000000000001";

function clearCookies() {
  for (const part of document.cookie.split(";")) {
    const name = part.split("=")[0].trim();
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
}

function lastRequest() {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return { url, init, headers: init?.headers as Headers };
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
  test("appends only defined query params", () => {
    expect(buildApiUrl("/api/students/", { search: "Nowak", page: 2, school: undefined })).toBe(
      "/api/students/?search=Nowak&page=2"
    );
  });

  test("rejects anything outside /api/", () => {
    expect(() => buildApiUrl("https://evil.example/api/")).toThrow();
    expect(() => buildApiUrl("//evil.example/api/")).toThrow();
    expect(() => buildApiUrl("/admin/")).toThrow();
  });
});

describe("fillPath", () => {
  test("substitutes and encodes path parameters", () => {
    expect(fillPath("/api/audit-logs/{id}/", { id: "a/b" })).toBe("/api/audit-logs/a%2Fb/");
  });

  test("throws when a parameter is missing", () => {
    expect(() => fillPath("/api/audit-logs/{id}/", {})).toThrow(/id/);
  });
});

describe("api client", () => {
  test("GET sends same-origin credentials and no CSRF header", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ email: "a@example.com" }));

    const user = await api.get("/api/auth/me/");

    expect(user.email).toBe("a@example.com");
    const { url, init, headers } = lastRequest();
    expect(url).toBe("/api/auth/me/");
    expect(init?.credentials).toBe("same-origin");
    expect(headers.has("X-CSRFToken")).toBe(false);
  });

  test("sends the school header, query and path parameters", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ id: "1" }));

    await api.get("/api/audit-logs/{id}/", { schoolId: SCHOOL_ID, path: { id: "1" } });

    expect(lastRequest().url).toBe("/api/audit-logs/1/");
    expect(lastRequest().headers.get("X-School-ID")).toBe(SCHOOL_ID);

    fetchMock.mockResolvedValueOnce(Response.json({ results: [] }));
    await api.get("/api/audit-logs/", {
      schoolId: SCHOOL_ID,
      query: { action: "login", ordering: "-created_at", page: 2 },
    });

    expect(lastRequest().url).toBe("/api/audit-logs/?action=login&ordering=-created_at&page=2");
  });

  test("POST uses the CSRF token from the cookie", async () => {
    document.cookie = "csrftoken=token123; path=/";
    fetchMock.mockResolvedValueOnce(Response.json({ detail: "ok" }));

    await api.post("/api/auth/logout/");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(lastRequest().headers.get("X-CSRFToken")).toBe("token123");
  });

  test("POST fetches a CSRF token first when the cookie is missing", async () => {
    fetchMock.mockImplementationOnce(async () => {
      document.cookie = "csrftoken=fresh; path=/";
      return new Response(null, { status: 204 });
    });
    fetchMock.mockResolvedValueOnce(Response.json({ id: "1" }));

    await api.post("/api/auth/login/", { body: { email: "a@example.com", password: "x" } });

    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/csrf/");
    const { url, init, headers } = lastRequest();
    expect(url).toBe("/api/auth/login/");
    expect(headers.get("X-CSRFToken")).toBe("fresh");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(init?.body).toBe('{"email":"a@example.com","password":"x"}');
  });

  test("throws ApiError with field errors for validation errors", async () => {
    document.cookie = "csrftoken=t; path=/";
    fetchMock.mockResolvedValueOnce(
      Response.json(
        {
          code: "validation_error",
          detail: "Popraw zaznaczone pola formularza.",
          field_errors: { email: ["Wprowadź poprawny adres e-mail."] },
        },
        { status: 400 }
      )
    );

    const error = await api
      .post("/api/auth/login/", { body: { email: "x", password: "y" } })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("validation_error");
    expect((error as ApiError).fieldErrors.email).toEqual(["Wprowadź poprawny adres e-mail."]);
  });

  test("throws a 401 ApiError when the session is missing", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json(
        { code: "not_authenticated", detail: "Nie podano danych uwierzytelniających." },
        { status: 401 }
      )
    );

    const error = (await api.get("/api/auth/me/").catch((e: unknown) => e)) as ApiError;

    expect(error.isUnauthenticated).toBe(true);
    expect(error.code).toBe("not_authenticated");
  });

  test("turns network failures into a network_error ApiError", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const error = (await api.get("/api/auth/me/").catch((e: unknown) => e)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe("network_error");
    expect(error.status).toBe(0);
  });

  test("returns undefined for 204 responses", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(api.get("/api/auth/csrf/")).resolves.toBeUndefined();
  });
});

// Compile-time checks: `npm run type-check` fails if the client stops matching the
// OpenAPI contract. The function is never called.
describe("typed client follows the OpenAPI contract", () => {
  test("response and path types", () => {
    expectTypeOf<ResponseData<Operation<"/api/auth/me/", "get">>>().toEqualTypeOf<
      ApiSchema["User"]
    >();
    expectTypeOf<ResponseData<Operation<"/api/auth/csrf/", "get">>>().toEqualTypeOf<undefined>();
    expectTypeOf<PathsWith<"post">>().toEqualTypeOf<"/api/auth/login/" | "/api/auth/logout/">();
  });

  test("invalid calls do not compile", () => {
    const calls = () => {
      void api.get("/api/auth/me/");
      void api.get("/api/audit-logs/", { schoolId: SCHOOL_ID, query: { ordering: "-action" } });
      void api.get("/api/audit-logs/{id}/", { schoolId: SCHOOL_ID, path: { id: "1" } });
      void api.post("/api/auth/login/", { body: { email: "a@example.com", password: "x" } });

      // @ts-expect-error unknown path
      void api.get("/api/nie-ma-takiego/");
      // @ts-expect-error logout has no GET
      void api.get("/api/auth/logout/");
      // @ts-expect-error X-School-ID is required for school data
      void api.get("/api/audit-logs/");
      // @ts-expect-error "name" is not an allowed ordering
      void api.get("/api/audit-logs/", { schoolId: SCHOOL_ID, query: { ordering: "name" } });
      // @ts-expect-error path parameter "id" is required
      void api.get("/api/audit-logs/{id}/", { schoolId: SCHOOL_ID });
      // @ts-expect-error login requires a body
      void api.post("/api/auth/login/");
      // @ts-expect-error password is required in the login body
      void api.post("/api/auth/login/", { body: { email: "a@example.com" } });
    };
    expect(typeof calls).toBe("function");
  });
});

import { describe, expect, test } from "vitest";
import { ApiError, errorFromResponse, normalizeErrorBody } from "../errors";

describe("normalizeErrorBody", () => {
  test("uses DRF detail and code", () => {
    const error = normalizeErrorBody(403, {
      detail: "Brak uprawnień do tej szkoły.",
      code: "school_forbidden",
    });

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe("Brak uprawnień do tej szkoły.");
    expect(error.code).toBe("school_forbidden");
    expect(error.isForbidden).toBe(true);
  });

  test("uses non_field_errors as the main message", () => {
    const error = normalizeErrorBody(400, {
      non_field_errors: ["Nieprawidłowy adres e-mail lub hasło."],
    });

    expect(error.message).toBe("Nieprawidłowy adres e-mail lub hasło.");
    expect(error.fieldErrors).toEqual({});
  });

  test("collects per-field validation errors", () => {
    const error = normalizeErrorBody(400, {
      email: ["Wpisz poprawny adres e-mail."],
      password: ["To pole jest wymagane."],
    });

    expect(error.code).toBe("invalid");
    expect(error.message).toBe("Popraw zaznaczone pola formularza.");
    expect(error.fieldErrors).toEqual({
      email: ["Wpisz poprawny adres e-mail."],
      password: ["To pole jest wymagane."],
    });
  });

  test("flattens nested serializer errors", () => {
    const error = normalizeErrorBody(400, { guardians: [{ phone: ["Błędny numer."] }] });

    expect(error.fieldErrors).toEqual({ guardians: ["Błędny numer."] });
  });

  test("falls back to a status-based message for empty or non-JSON bodies", () => {
    expect(normalizeErrorBody(401, null)).toMatchObject({
      code: "not_authenticated",
      isUnauthenticated: true,
    });
    expect(normalizeErrorBody(500, "<html>")).toMatchObject({ code: "server_error" });
    expect(normalizeErrorBody(502, null).message).toMatch(/błąd serwera/);
  });
});

describe("errorFromResponse", () => {
  test("parses JSON bodies", async () => {
    const response = Response.json({ detail: "Nie znaleziono." }, { status: 404 });

    const error = await errorFromResponse(response);

    expect(error.status).toBe(404);
    expect(error.message).toBe("Nie znaleziono.");
  });

  test("ignores non-JSON bodies such as Django debug pages", async () => {
    const response = new Response("<html>Server Error</html>", {
      status: 500,
      headers: { "content-type": "text/html" },
    });

    const error = await errorFromResponse(response);

    expect(error.code).toBe("server_error");
    expect(error.message).not.toContain("<html>");
  });
});

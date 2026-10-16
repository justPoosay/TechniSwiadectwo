import { describe, expect, test } from "vitest";
import { ApiError, errorFromResponse, normalizeErrorBody } from "../errors";

describe("normalizeErrorBody", () => {
  test("reads the unified ErrorResponse format", () => {
    const error = normalizeErrorBody(403, {
      code: "csrf_failed",
      detail: "Brak lub nieprawidłowy token CSRF.",
    });

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe("csrf_failed");
    expect(error.message).toBe("Brak lub nieprawidłowy token CSRF.");
    expect(error.fieldErrors).toEqual({});
    expect(error.isForbidden).toBe(true);
  });

  test("keeps field errors, including nested keys", () => {
    const error = normalizeErrorBody(400, {
      code: "validation_error",
      detail: "Popraw zaznaczone pola formularza.",
      field_errors: { email: ["Wprowadź poprawny adres e-mail."], "guardians.0.phone": ["Zły"] },
    });

    expect(error.fieldErrors).toEqual({
      email: ["Wprowadź poprawny adres e-mail."],
      "guardians.0.phone": ["Zły"],
    });
  });

  test("falls back to a status-based message for unknown bodies", () => {
    expect(normalizeErrorBody(401, null)).toMatchObject({
      code: "not_authenticated",
      isUnauthenticated: true,
    });
    expect(normalizeErrorBody(500, "<html>")).toMatchObject({ code: "server_error" });
    expect(normalizeErrorBody(400, { email: ["raw DRF"] }).code).toBe("validation_error");
  });
});

describe("errorFromResponse", () => {
  test("parses JSON bodies", async () => {
    const response = Response.json(
      { code: "not_found", detail: "Nie znaleziono zasobu." },
      { status: 404 }
    );

    const error = await errorFromResponse(response);

    expect(error.status).toBe(404);
    expect(error.message).toBe("Nie znaleziono zasobu.");
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

import type { components } from "./schema";

/** Error body returned by Django and by the /api proxy (see docs/api/openapi.yaml). */
export type ErrorResponse = components["schemas"]["ErrorResponse"];
export type FieldErrors = Record<string, string[]>;

/** Single error type for every failed API call. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string,
    readonly fieldErrors: FieldErrors = {}
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** No valid session: the user has to log in (again). */
  get isUnauthenticated(): boolean {
    return this.status === 401;
  }

  /** Logged in, but the role or school does not allow this operation. */
  get isForbidden(): boolean {
    return this.status === 403;
  }
}

const DEFAULTS: Record<number, [code: string, message: string]> = {
  0: ["network_error", "Brak połączenia z serwerem. Sprawdź połączenie i spróbuj ponownie."],
  400: ["validation_error", "Przesłane dane są nieprawidłowe."],
  401: ["not_authenticated", "Sesja wygasła. Zaloguj się ponownie."],
  403: ["permission_denied", "Nie masz uprawnień do wykonania tej operacji."],
  404: ["not_found", "Nie znaleziono zasobu."],
  409: ["conflict", "Dane zostały w międzyczasie zmienione. Odśwież i spróbuj ponownie."],
  429: ["throttled", "Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie."],
};

function defaultsFor(status: number): [string, string] {
  return (
    DEFAULTS[status] ??
    (status >= 500
      ? ["server_error", "Wystąpił błąd serwera. Spróbuj ponownie później."]
      : ["error", "Wystąpił nieoczekiwany błąd."])
  );
}

function isErrorResponse(body: unknown): body is ErrorResponse {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof (body as ErrorResponse).code === "string" &&
    typeof (body as ErrorResponse).detail === "string"
  );
}

/** Any other body (HTML error page, empty response...) falls back to a status-based message. */
export function normalizeErrorBody(status: number, body: unknown): ApiError {
  if (isErrorResponse(body)) {
    const [, defaultMessage] = defaultsFor(status);
    return new ApiError(status, body.detail || defaultMessage, body.code, body.field_errors ?? {});
  }
  const [code, message] = defaultsFor(status);
  return new ApiError(status, message, code);
}

export async function errorFromResponse(response: Response): Promise<ApiError> {
  let body: unknown = null;
  if (response.headers.get("content-type")?.includes("application/json")) {
    body = await response.json().catch(() => null);
  }
  return normalizeErrorBody(response.status, body);
}

export function networkError(): ApiError {
  const [code, message] = defaultsFor(0);
  return new ApiError(0, message, code);
}

export type FieldErrors = Record<string, string[]>;

/** Single error type for every failed API call, whatever shape Django returned. */
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
  400: ["invalid", "Przesłane dane są nieprawidłowe."],
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

function toMessages(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(toMessages);
  if (value && typeof value === "object") return Object.values(value).flatMap(toMessages);
  return [];
}

/** Normalises DRF error bodies: {detail}, {non_field_errors}, {field: [...]}, [...]. */
export function normalizeErrorBody(status: number, body: unknown): ApiError {
  const [defaultCode, defaultMessage] = defaultsFor(status);

  if (Array.isArray(body) || typeof body === "string") {
    return new ApiError(status, toMessages(body)[0] ?? defaultMessage, defaultCode);
  }
  if (!body || typeof body !== "object") {
    return new ApiError(status, defaultMessage, defaultCode);
  }

  const { detail, code, non_field_errors: nonField, ...fields } = body as Record<string, unknown>;
  const errorCode = typeof code === "string" ? code : defaultCode;

  if (typeof detail === "string") {
    return new ApiError(status, detail, errorCode);
  }

  const fieldErrors: FieldErrors = {};
  for (const [field, value] of Object.entries(fields)) {
    const messages = toMessages(value);
    if (messages.length) fieldErrors[field] = messages;
  }
  const generalMessage = toMessages(nonField)[0];
  const message =
    generalMessage ??
    (Object.keys(fieldErrors).length ? "Popraw zaznaczone pola formularza." : defaultMessage);

  return new ApiError(status, message, errorCode, fieldErrors);
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

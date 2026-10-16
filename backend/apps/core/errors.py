"""Error codes and body builder shared by the exception handler and plain Django views.

Kept free of rest_framework.views imports: apps.users.authentication uses it and
is itself imported while DRF initialises its settings.
"""

from typing import Any

VALIDATION_ERROR_CODE = "validation_error"
VALIDATION_ERROR_DETAIL = "Popraw zaznaczone pola formularza."
SERVER_ERROR_CODE = "server_error"
SERVER_ERROR_DETAIL = "Wystąpił błąd serwera. Spróbuj ponownie później."
NOT_FOUND_CODE = "not_found"
NOT_FOUND_DETAIL = "Nie znaleziono zasobu."
CSRF_FAILED_CODE = "csrf_failed"
CSRF_FAILED_DETAIL = (
    "Brak lub nieprawidłowy token CSRF. Odśwież stronę i spróbuj ponownie."
)


def error_body(
    code: str, detail: str, field_errors: dict[str, list[str]] | None = None
) -> dict[str, Any]:
    body: dict[str, Any] = {"code": code, "detail": detail}
    if field_errors:
        body["field_errors"] = field_errors
    return body

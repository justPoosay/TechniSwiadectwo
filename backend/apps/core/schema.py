from typing import Any

from drf_spectacular.openapi import AutoSchema as SpectacularAutoSchema
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter
from rest_framework import serializers
from rest_framework.permissions import AllowAny

from apps.core.mixins import SchoolScopedViewSetMixin

SCHOOL_HEADER = OpenApiParameter(
    name="X-School-ID",
    type=OpenApiTypes.UUID,
    location=OpenApiParameter.HEADER,
    required=True,
    description=(
        "Identyfikator szkoły, w kontekście której wykonywane jest żądanie. "
        "Użytkownik musi mieć aktywne członkostwo w tej szkole."
    ),
)

UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

# Django derives IntegerField min/max from the database backend: 64-bit on SQLite
# (tests), 32-bit on PostgreSQL. Left in, they would make the schema depend on the
# database it was generated with.
DATABASE_INTEGER_BOUNDS = {-(2**31), 2**31 - 1, -(2**63), 2**63 - 1}

ERROR_DESCRIPTIONS = {
    "400": "Nieprawidłowe dane (`code`: `validation_error`, szczegóły w `field_errors`).",
    "401": "Brak zalogowanej sesji (`code`: `not_authenticated`).",
    "403": (
        "Brak uprawnień (`permission_denied`) albo brak/nieprawidłowy token CSRF "
        "(`csrf_failed`)."
    ),
    "404": "Nie znaleziono zasobu (`code`: `not_found`).",
}


class ErrorResponseSerializer(serializers.Serializer):
    code = serializers.CharField(
        help_text=(
            "Stabilny kod błędu, np. `validation_error`, `not_authenticated`, "
            "`permission_denied`, `csrf_failed`, `not_found`, `server_error`."
        )
    )
    detail = serializers.CharField(help_text="Komunikat do wyświetlenia użytkownikowi.")
    field_errors = serializers.DictField(
        child=serializers.ListField(child=serializers.CharField()),
        required=False,
        help_text=(
            "Błędy poszczególnych pól (tylko dla `validation_error`). "
            "Pola zagnieżdżone mają klucze z kropką, np. `guardians.0.phone`."
        ),
    )

    class Meta:
        ref_name = "ErrorResponse"


class AutoSchema(SpectacularAutoSchema):
    """Adds the shared error responses and the school header to every operation."""

    def _is_public(self) -> bool:
        return all(isinstance(p, AllowAny) for p in self.view.get_permissions())

    def _error_codes(self) -> list[str]:
        codes = []
        if self._has_request_body() or self._has_query_params():
            codes.append("400")
        if not self._is_public():
            codes.append("401")
        if not self._is_public() or self.method in UNSAFE_METHODS:
            codes.append("403")
        if "{" in self.path:
            codes.append("404")
        return codes

    def _has_request_body(self) -> bool:
        return (
            self.method in UNSAFE_METHODS and self.get_request_serializer() is not None
        )

    def _has_query_params(self) -> bool:
        return self.method == "GET" and self._is_list_view()

    def _get_response_bodies(self, direction: Any = "response") -> dict[str, Any]:
        responses = super()._get_response_bodies(direction)
        for code in self._error_codes():
            if code not in responses:
                response = self._get_response_for_code(
                    ErrorResponseSerializer, code, direction=direction
                )
                response["description"] = ERROR_DESCRIPTIONS[code]
                responses[code] = response
        return responses

    def get_override_parameters(self) -> list[Any]:
        parameters = list(super().get_override_parameters())
        if isinstance(self.view, SchoolScopedViewSetMixin):
            parameters.append(SCHOOL_HEADER)
        return parameters


def strip_database_integer_bounds(result: Any, **kwargs: Any) -> Any:
    """Postprocessing hook: drop backend-specific integer limits from the schema.

    Explicit limits (e.g. ``min_value=1`` on a serializer field) are kept.
    """

    def walk(node: Any) -> None:
        if isinstance(node, dict):
            if node.get("type") == "integer" and (
                node.get("minimum") in DATABASE_INTEGER_BOUNDS
                or node.get("maximum") in DATABASE_INTEGER_BOUNDS
            ):
                for key in ("minimum", "maximum"):
                    if node.get(key) in DATABASE_INTEGER_BOUNDS:
                        del node[key]
                if node.get("format") == "int64":
                    del node["format"]
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(result)
    return result

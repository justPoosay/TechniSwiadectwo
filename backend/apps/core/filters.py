from typing import Any

import django_filters
from rest_framework import filters

from apps.core.models import AuditLog


class SearchFilter(filters.SearchFilter):
    search_description = "Wyszukiwanie tekstowe (bez rozróżniania wielkości liter)."


class OrderingFilter(filters.OrderingFilter):
    """Lists the allowed ``ordering`` values as an enum in the OpenAPI schema."""

    ordering_description = "Sortowanie: nazwa pola rosnąco, z prefiksem `-` malejąco."

    def get_schema_operation_parameters(self, view: Any) -> list[dict[str, Any]]:
        parameters = super().get_schema_operation_parameters(view)
        fields = getattr(view, "ordering_fields", None)
        if isinstance(fields, list | tuple):
            values = [value for field in fields for value in (field, f"-{field}")]
            for parameter in parameters:
                parameter["schema"]["enum"] = values
        return parameters


class AuditLogFilter(django_filters.FilterSet):
    created_after = django_filters.IsoDateTimeFilter(
        field_name="created_at",
        lookup_expr="gte",
        label="Zdarzenia od (ISO 8601)",
    )
    created_before = django_filters.IsoDateTimeFilter(
        field_name="created_at",
        lookup_expr="lte",
        label="Zdarzenia do (ISO 8601)",
    )

    class Meta:
        model = AuditLog
        fields = ["action", "target_type", "actor"]

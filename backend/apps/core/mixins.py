from typing import Any, cast

from django.db import models


class SchoolScopedViewSetMixin:
    def get_queryset(self) -> models.QuerySet[Any]:
        queryset = super().get_queryset()  # type: ignore[misc]
        request = getattr(self, "request", None)
        school = getattr(request, "school", None) if request else None

        if school is not None:
            filtered_qs = queryset.filter(school=school)
            return cast(models.QuerySet[Any], filtered_qs)

        empty_qs = queryset.none()
        return cast(models.QuerySet[Any], empty_qs)

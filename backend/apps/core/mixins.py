from typing import Any

from django.db import models


class SchoolScopedViewSetMixin:
    def get_queryset(self) -> models.QuerySet[Any]:
        queryset = super().get_queryset()  # type: ignore[misc]
        school = getattr(self.request, "school", None)

        if school:
            return queryset.filter(school=school)

        return queryset.none()

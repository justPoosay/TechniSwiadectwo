from typing import Any, cast

from django.db import models

from apps.core.types import AuthenticatedSchoolRequest


class SchoolScopedViewSetMixin:
    request: AuthenticatedSchoolRequest

    def get_queryset(self) -> models.QuerySet[Any]:
        queryset = super().get_queryset()  # type: ignore[misc]
        school = getattr(self.request, "school", None)

        if school is not None:
            filtered_qs = queryset.filter(school=school)
            return cast(models.QuerySet[Any], filtered_qs)

        empty_qs = queryset.none()
        return cast(models.QuerySet[Any], empty_qs)

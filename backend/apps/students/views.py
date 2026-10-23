from typing import Any

from django.db import models
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import viewsets

from apps.core.mixins import SchoolScopedViewSetMixin
from apps.core.permissions import HasSchoolRole
from apps.students.filters import StudentFilter
from apps.students.models import Student
from apps.students.serializers import StudentDetailSerializer, StudentListSerializer
from apps.users.models import SchoolMembership


@extend_schema_view(
    list=extend_schema(
        tags=["students"],
        summary="Lista uczniów",
        description="Lista uczniów szkoły z paginacją, wyszukiwaniem i filtrowaniem.",
    ),
    retrieve=extend_schema(
        tags=["students"],
        summary="Szczegóły ucznia",
        description="Szczegółowe dane ucznia wraz z historią przebiegu nauki i rejestrem korekt.",
    ),
)
class StudentViewSet(SchoolScopedViewSetMixin, viewsets.ReadOnlyModelViewSet):
    queryset = Student.objects.all()
    permission_classes = [HasSchoolRole]
    allowed_roles = [
        SchoolMembership.Role.SECRETARIAT,
        SchoolMembership.Role.PRINCIPAL,
        SchoolMembership.Role.ADMIN,
    ]
    http_method_names = ["get", "head", "options"]
    filterset_class = StudentFilter
    search_fields = ["first_name", "last_name", "pesel", "register_number"]
    ordering_fields = [
        "last_name",
        "first_name",
        "register_number",
        "date_of_birth",
        "created_at",
    ]
    ordering = ["last_name", "first_name"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return StudentDetailSerializer
        return StudentListSerializer

    def get_queryset(self) -> models.QuerySet[Any]:
        qs = super().get_queryset()
        if self.action == "retrieve":
            return qs.select_related(
                "school", "cohort", "cohort__academic_year"
            ).prefetch_related(
                "history_entries__academic_year",
                "history_entries__source_cohort",
                "history_entries__target_cohort",
                "data_corrections__author",
            )
        return qs.select_related("school", "cohort", "cohort__academic_year")

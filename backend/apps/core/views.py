from django.http import HttpRequest, HttpResponse, JsonResponse
from django.views import defaults
from django.views.csrf import csrf_failure as django_csrf_failure
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.core.errors import (
    CSRF_FAILED_CODE,
    CSRF_FAILED_DETAIL,
    NOT_FOUND_CODE,
    NOT_FOUND_DETAIL,
    SERVER_ERROR_CODE,
    SERVER_ERROR_DETAIL,
    error_body,
)
from apps.core.filters import AuditLogFilter
from apps.core.mixins import SchoolScopedViewSetMixin
from apps.core.models import AuditLog, Cohort
from apps.core.permissions import HasSchoolRole
from apps.users.models import SchoolMembership


@extend_schema(
    summary="Stan aplikacji",
    responses=inline_serializer("Health", fields={"status": serializers.CharField()}),
)
@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok"})


class AuditLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.EmailField(
        source="actor.email", read_only=True, allow_null=True
    )

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "actor_email",
            "action",
            "target_type",
            "target_id",
            "changes",
            "ip_address",
            "created_at",
        ]


@extend_schema(tags=["audit-logs"])
class AuditLogViewSet(SchoolScopedViewSetMixin, viewsets.ReadOnlyModelViewSet):
    """Dziennik audytu szkoły (tylko odczyt)."""

    queryset = AuditLog.objects.select_related("actor")
    serializer_class = AuditLogSerializer
    permission_classes = [HasSchoolRole]
    allowed_roles = [SchoolMembership.Role.PRINCIPAL, SchoolMembership.Role.ADMIN]
    http_method_names = ["get", "head", "options"]
    filterset_class = AuditLogFilter
    search_fields = ["target_type", "target_id"]
    ordering_fields = ["created_at", "action"]
    ordering = ["-created_at"]


class CohortSerializer(serializers.ModelSerializer):
    academic_year_name = serializers.CharField(
        source="academic_year.name", read_only=True
    )

    class Meta:
        model = Cohort
        fields = ["id", "name", "level", "academic_year", "academic_year_name"]


@extend_schema(tags=["cohorts"])
class CohortViewSet(SchoolScopedViewSetMixin, viewsets.ReadOnlyModelViewSet):
    """Klasy szkoły (tylko odczyt), np. do filtrowania listy uczniów."""

    queryset = Cohort.objects.select_related("academic_year")
    serializer_class = CohortSerializer
    permission_classes = [HasSchoolRole]
    http_method_names = ["get", "head", "options"]
    filterset_fields = ["academic_year"]
    ordering_fields = ["name", "level"]
    ordering = ["-academic_year__start_date", "level", "name"]


def _is_api_request(request: HttpRequest) -> bool:
    return request.path.startswith("/api/")


def _json_error(code: str, detail: str, status: int) -> JsonResponse:
    return JsonResponse(
        error_body(code, detail),
        status=status,
        json_dumps_params={"ensure_ascii": False},
    )


def csrf_failure(request: HttpRequest, reason: str = "") -> HttpResponse:
    """CSRF_FAILURE_VIEW: JSON for the API, Django's default page elsewhere."""
    if _is_api_request(request):
        return _json_error(CSRF_FAILED_CODE, CSRF_FAILED_DETAIL, 403)
    return django_csrf_failure(request, reason)


def api_not_found(request: HttpRequest, path: str = "") -> HttpResponse:
    """Catch-all for unknown /api/ URLs, so they get JSON also when DEBUG=True."""
    return _json_error(NOT_FOUND_CODE, NOT_FOUND_DETAIL, 404)


def not_found(request: HttpRequest, exception: Exception) -> HttpResponse:
    """handler404 (DEBUG=False only)."""
    if _is_api_request(request):
        return api_not_found(request)
    return defaults.page_not_found(request, exception)


def server_error(request: HttpRequest) -> HttpResponse:
    """handler500 for errors outside DRF views (DEBUG=False only)."""
    if _is_api_request(request):
        return _json_error(SERVER_ERROR_CODE, SERVER_ERROR_DETAIL, 500)
    return defaults.server_error(request)

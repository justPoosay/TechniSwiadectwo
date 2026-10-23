from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AuditLogViewSet, CohortViewSet, health_check

app_name = "core"

router = DefaultRouter()
router.register(r"audit-logs", AuditLogViewSet, basename="audit-log")
router.register(r"cohorts", CohortViewSet, basename="cohort")

urlpatterns = [
    path("health/", health_check, name="health"),
    path("", include(router.urls)),
]

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.students.views import StudentViewSet

app_name = "students"

router = DefaultRouter()
router.register(r"students", StudentViewSet, basename="student")

urlpatterns = [
    path("", include(router.urls)),
]

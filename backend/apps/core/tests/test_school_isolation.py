import pytest
from django.urls import path
from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.test import APIClient

from apps.core.models import School
from apps.core.permissions import IsSchoolMember
from apps.users.models import SchoolMembership, User


class DummyScopedViewSet(viewsets.ViewSet):
    permission_classes = [IsSchoolMember]

    def list(self, request):
        return Response({"message": "Dostęp przyznany!"})


# Temp url just for the test
urlpatterns = [
    path("api/test-scoped/", DummyScopedViewSet.as_view({"get": "list"})),
]


@pytest.mark.urls("apps.core.tests.test_school_isolation")
@pytest.mark.django_db
class TestSchoolDataIsolation:
    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.school_a = School.objects.create(name="Szkoła A")
        self.school_b = School.objects.create(name="Szkoła B")

        self.user_a = User.objects.create_user(
            email="user_a@test.com",
            password="password123",
            first_name="Jan",
            last_name="Kowalski",
        )

        SchoolMembership.objects.create(
            user=self.user_a,
            school=self.school_a,
            role=SchoolMembership.Role.TEACHER,
            is_active=True,
        )

        self.client = APIClient()

    def test_user_cannot_access_school_they_do_not_belong_to(self):
        self.client.force_authenticate(user=self.user_a)

        response = self.client.get(
            "/api/test-scoped/",
            HTTP_X_SCHOOL_ID=str(self.school_b.id),
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_user_can_access_their_own_school(self):
        self.client.force_login(user=self.user_a)

        response = self.client.get(
            "/api/test-scoped/",
            HTTP_X_SCHOOL_ID=str(self.school_a.id),
        )

        assert response.status_code == status.HTTP_200_OK

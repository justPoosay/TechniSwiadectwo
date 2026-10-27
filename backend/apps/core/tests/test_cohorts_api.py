from datetime import date

import pytest
from rest_framework.test import APIClient

from apps.core.models import AcademicYear, Cohort, School
from apps.users.models import SchoolMembership, User


def make_year(school: School, name: str, start_year: int) -> AcademicYear:
    return AcademicYear.objects.create(
        school=school,
        name=name,
        start_date=date(start_year, 9, 1),
        end_date=date(start_year + 1, 6, 26),
    )


@pytest.fixture
def school() -> School:
    return School.objects.create(name="Technikum nr 1", city="Warszawa")


@pytest.fixture
def client(school: School) -> APIClient:
    user = User.objects.create_user(email="nauczyciel@szkola1.pl", password="x")
    SchoolMembership.objects.create(
        user=user, school=school, role=SchoolMembership.Role.TEACHER, is_active=True
    )
    api = APIClient()
    api.force_login(user)
    api.credentials(HTTP_X_SCHOOL_ID=str(school.id))
    return api


@pytest.mark.django_db
class TestCohortsApi:
    def test_lists_cohorts_newest_year_first(
        self, client: APIClient, school: School
    ) -> None:
        old = make_year(school, "2024/2025", 2024)
        new = make_year(school, "2025/2026", 2025)
        Cohort.objects.create(school=school, academic_year=old, name="1A", level=1)
        Cohort.objects.create(school=school, academic_year=new, name="2B", level=2)
        Cohort.objects.create(school=school, academic_year=new, name="2A", level=2)

        body = client.get("/api/cohorts/").json()

        assert [(c["name"], c["academic_year_name"]) for c in body["results"]] == [
            ("2A", "2025/2026"),
            ("2B", "2025/2026"),
            ("1A", "2024/2025"),
        ]

    def test_filter_by_academic_year(self, client: APIClient, school: School) -> None:
        old = make_year(school, "2024/2025", 2024)
        new = make_year(school, "2025/2026", 2025)
        Cohort.objects.create(school=school, academic_year=old, name="1A", level=1)
        Cohort.objects.create(school=school, academic_year=new, name="2A", level=2)

        body = client.get("/api/cohorts/", {"academic_year": str(new.id)}).json()

        assert [c["name"] for c in body["results"]] == ["2A"]

    def test_other_school_cohorts_are_hidden(
        self, client: APIClient, school: School
    ) -> None:
        other = School.objects.create(name="Inna szkoła", city="Kraków")
        Cohort.objects.create(
            school=other,
            academic_year=make_year(other, "2025/2026", 2025),
            name="9Z",
            level=1,
        )

        assert client.get("/api/cohorts/").json()["count"] == 0

    def test_is_read_only(self, client: APIClient) -> None:
        response = client.post("/api/cohorts/", {"name": "1A"}, format="json")

        assert response.status_code == 405

    def test_requires_school_header(self, client: APIClient) -> None:
        client.credentials()

        assert client.get("/api/cohorts/").status_code == 403

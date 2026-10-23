"""T28: authentication, role-based access and school isolation.

Access matrix (docs/permissions.md):

| endpoint                | secretariat | teacher | homeroom_teacher | principal | admin |
| ----------------------- | ----------- | ------- | ---------------- | --------- | ----- |
| GET /api/auth/me/       | yes         | yes     | yes              | yes       | yes   |
| GET /api/cohorts/       | yes         | yes     | yes              | yes       | yes   |
| GET /api/students/...   | yes         | no      | no               | yes       | yes   |
| GET /api/audit-logs/... | no          | no      | no               | yes       | yes   |
"""

from datetime import date, timedelta
from typing import Any

import pytest
from django.conf import settings
from django.contrib.sessions.models import Session
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.models import AcademicYear, AuditLog, Cohort, School
from apps.students.models import Student
from apps.users.models import SchoolMembership, User

Role = SchoolMembership.Role
PASSWORD = "testowe-haslo-123"

STUDENT_ROLES = {Role.SECRETARIAT, Role.PRINCIPAL, Role.ADMIN}
AUDIT_ROLES = {Role.PRINCIPAL, Role.ADMIN}
ALL_ROLES = set(Role)


class SchoolData:
    def __init__(self, name: str) -> None:
        self.school = School.objects.create(name=name, city="Testowo")
        year = AcademicYear.objects.create(
            school=self.school,
            name="2025/2026",
            start_date=date(2025, 9, 1),
            end_date=date(2026, 6, 26),
        )
        self.cohort = Cohort.objects.create(
            school=self.school, academic_year=year, name="1A", level=1
        )
        self.student = Student.objects.create(
            school=self.school,
            cohort=self.cohort,
            first_name="Uczeń",
            last_name=name,
            date_of_birth=date(2010, 1, 1),
            place_of_birth="Testowo",
            id_document_type=Student.IdDocumentType.PASSPORT,
            id_document_number=f"T{self.school.pk}"[:20],
            register_number="1/2025",
        )
        self.audit_log = AuditLog.objects.create(
            school=self.school,
            action=AuditLog.Action.UPDATE,
            target_type="Student",
            target_id=str(self.student.pk),
        )


@pytest.fixture
def school_a() -> SchoolData:
    return SchoolData("Szkoła A")


@pytest.fixture
def school_b() -> SchoolData:
    return SchoolData("Szkoła B")


def make_user(email: str, **memberships: Any) -> User:
    """make_user("x@a.pl", a=(school, role)) – one membership per keyword."""
    user = User.objects.create_user(email=email, password=PASSWORD)
    for school, role in memberships.values():
        SchoolMembership.objects.create(
            user=user, school=school, role=role, is_active=True
        )
    return user


def client_for(user: User, school: School | None) -> APIClient:
    client = APIClient()
    client.force_login(user)
    if school is not None:
        client.credentials(HTTP_X_SCHOOL_ID=str(school.pk))
    return client


def endpoints(data: SchoolData) -> dict[str, tuple[str, set[Role]]]:
    return {
        "me": ("/api/auth/me/", ALL_ROLES),
        "cohorts": ("/api/cohorts/", ALL_ROLES),
        "students": ("/api/students/", STUDENT_ROLES),
        "student": (f"/api/students/{data.student.pk}/", STUDENT_ROLES),
        "audit-logs": ("/api/audit-logs/", AUDIT_ROLES),
        "audit-log": (f"/api/audit-logs/{data.audit_log.pk}/", AUDIT_ROLES),
    }


ENDPOINT_NAMES = ["me", "cohorts", "students", "student", "audit-logs", "audit-log"]
SCHOOL_ENDPOINTS = [name for name in ENDPOINT_NAMES if name != "me"]


@pytest.mark.django_db
class TestRoleMatrix:
    @pytest.mark.parametrize("role", list(Role))
    @pytest.mark.parametrize("endpoint", ENDPOINT_NAMES)
    def test_access_follows_role_matrix(
        self, school_a: SchoolData, role: Role, endpoint: str
    ) -> None:
        url, allowed = endpoints(school_a)[endpoint]
        user = make_user(f"{role}@a.pl", a=(school_a.school, role))

        response = client_for(user, school_a.school).get(url)

        if role in allowed:
            assert response.status_code == 200
        else:
            assert response.status_code == 403
            assert response.json()["code"] == "permission_denied"

    @pytest.mark.parametrize("endpoint", ENDPOINT_NAMES)
    def test_anonymous_gets_401(self, school_a: SchoolData, endpoint: str) -> None:
        url, _ = endpoints(school_a)[endpoint]
        client = APIClient()
        client.credentials(HTTP_X_SCHOOL_ID=str(school_a.school.pk))

        response = client.get(url)

        assert response.status_code == 401
        assert response.json()["code"] == "not_authenticated"

    @pytest.mark.parametrize("endpoint", SCHOOL_ENDPOINTS)
    def test_school_data_requires_school_header(
        self, school_a: SchoolData, endpoint: str
    ) -> None:
        url, _ = endpoints(school_a)[endpoint]
        user = make_user("admin@a.pl", a=(school_a.school, Role.ADMIN))

        assert client_for(user, None).get(url).status_code == 403


@pytest.mark.django_db
class TestSchoolIsolation:
    @pytest.mark.parametrize("endpoint", SCHOOL_ENDPOINTS)
    def test_header_of_foreign_school_is_rejected(
        self, school_a: SchoolData, school_b: SchoolData, endpoint: str
    ) -> None:
        url, _ = endpoints(school_b)[endpoint]
        user = make_user("admin@a.pl", a=(school_a.school, Role.ADMIN))

        response = client_for(user, school_b.school).get(url)

        assert response.status_code == 403

    def test_school_id_query_parameter_cannot_bypass_membership(
        self, school_a: SchoolData, school_b: SchoolData
    ) -> None:
        user = make_user("admin@a.pl", a=(school_a.school, Role.ADMIN))
        client = client_for(user, None)

        response = client.get("/api/students/", {"school_id": str(school_b.school.pk)})

        assert response.status_code == 403

    @pytest.mark.parametrize("endpoint", ["student", "audit-log"])
    def test_foreign_object_is_not_found_in_own_school(
        self, school_a: SchoolData, school_b: SchoolData, endpoint: str
    ) -> None:
        url, _ = endpoints(school_b)[endpoint]
        user = make_user("admin@a.pl", a=(school_a.school, Role.ADMIN))

        response = client_for(user, school_a.school).get(url)

        # 404, not 403: the API does not reveal that the object exists elsewhere.
        assert response.status_code == 404
        assert response.json()["code"] == "not_found"

    @pytest.mark.parametrize(
        ("endpoint", "field"),
        [("students", "last_name"), ("cohorts", "id"), ("audit-logs", "id")],
    )
    def test_lists_contain_only_own_school(
        self, school_a: SchoolData, school_b: SchoolData, endpoint: str, field: str
    ) -> None:
        url, _ = endpoints(school_a)[endpoint]
        user = make_user("admin@a.pl", a=(school_a.school, Role.ADMIN))

        results = client_for(user, school_a.school).get(url).json()["results"]

        assert results
        own = {
            "students": school_a.student.last_name,
            "cohorts": str(school_a.cohort.pk),
            "audit-logs": str(school_a.audit_log.pk),
        }[endpoint]
        assert {row[field] for row in results} == {own}

    def test_role_is_evaluated_per_school(
        self, school_a: SchoolData, school_b: SchoolData
    ) -> None:
        user = make_user(
            "dwie-szkoly@example.com",
            a=(school_a.school, Role.SECRETARIAT),
            b=(school_b.school, Role.TEACHER),
        )

        assert (
            client_for(user, school_a.school).get("/api/students/").status_code == 200
        )
        assert (
            client_for(user, school_b.school).get("/api/students/").status_code == 403
        )

    def test_superuser_without_membership_sees_no_school_data(
        self, school_a: SchoolData
    ) -> None:
        admin = User.objects.create_superuser(email="root@example.com", password="x")

        response = client_for(admin, school_a.school).get("/api/students/")

        assert response.status_code == 200
        assert response.json()["count"] == 0


@pytest.mark.django_db
class TestSession:
    def login(self, client: APIClient, user: User) -> None:
        response = client.post(
            "/api/auth/login/",
            {"email": user.email, "password": PASSWORD},
            format="json",
        )
        assert response.status_code == 200

    def test_session_cookie_settings(self, school_a: SchoolData) -> None:
        user = make_user("s@a.pl", a=(school_a.school, Role.SECRETARIAT))
        client = APIClient()

        response = client.post(
            "/api/auth/login/",
            {"email": user.email, "password": PASSWORD},
            format="json",
        )

        cookie = response.cookies[settings.SESSION_COOKIE_NAME]
        assert cookie["httponly"]
        assert cookie["samesite"] == "Lax"
        assert int(cookie["max-age"]) == settings.SESSION_COOKIE_AGE

    def test_expired_session_is_rejected(self, school_a: SchoolData) -> None:
        user = make_user("s@a.pl", a=(school_a.school, Role.SECRETARIAT))
        client = APIClient()
        self.login(client, user)
        assert client.get("/api/auth/me/").status_code == 200

        Session.objects.update(expire_date=timezone.now() - timedelta(seconds=1))

        response = client.get("/api/auth/me/")
        assert response.status_code == 401
        assert response.json()["code"] == "not_authenticated"

    def test_session_cookie_is_useless_after_logout(self, school_a: SchoolData) -> None:
        user = make_user("s@a.pl", a=(school_a.school, Role.SECRETARIAT))
        client = APIClient()
        self.login(client, user)
        stolen = client.cookies[settings.SESSION_COOKIE_NAME].value

        assert client.post("/api/auth/logout/").status_code == 200

        replay = APIClient()
        replay.cookies[settings.SESSION_COOKIE_NAME] = stolen
        assert replay.get("/api/auth/me/").status_code == 401

    def test_deactivated_account_loses_access_immediately(
        self, school_a: SchoolData
    ) -> None:
        user = make_user("s@a.pl", a=(school_a.school, Role.SECRETARIAT))
        client = client_for(user, school_a.school)
        assert client.get("/api/students/").status_code == 200

        User.objects.filter(pk=user.pk).update(is_active=False)

        assert client.get("/api/students/").status_code == 401

    def test_deactivated_membership_loses_school_access(
        self, school_a: SchoolData
    ) -> None:
        user = make_user("s@a.pl", a=(school_a.school, Role.SECRETARIAT))
        client = client_for(user, school_a.school)

        SchoolMembership.objects.filter(user=user).update(is_active=False)

        assert client.get("/api/students/").status_code == 403
        assert client.get("/api/auth/me/").status_code == 200

    def test_role_change_applies_to_next_request(self, school_a: SchoolData) -> None:
        user = make_user("s@a.pl", a=(school_a.school, Role.SECRETARIAT))
        client = client_for(user, school_a.school)
        assert client.get("/api/students/").status_code == 200

        SchoolMembership.objects.filter(user=user).update(role=Role.TEACHER)

        assert client.get("/api/students/").status_code == 403

    def test_inactive_account_cannot_log_in(self, school_a: SchoolData) -> None:
        user = make_user("s@a.pl", a=(school_a.school, Role.SECRETARIAT))
        User.objects.filter(pk=user.pk).update(is_active=False)

        response = APIClient().post(
            "/api/auth/login/",
            {"email": user.email, "password": PASSWORD},
            format="json",
        )

        assert response.status_code == 400
        assert settings.SESSION_COOKIE_NAME not in response.cookies

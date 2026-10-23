from datetime import timedelta
from pathlib import Path

import pytest
from django.conf import settings
from django.utils import timezone
from drf_spectacular.generators import SchemaGenerator
from drf_spectacular.renderers import OpenApiYamlRenderer
from drf_spectacular.validation import validate_schema
from rest_framework import exceptions
from rest_framework.test import APIClient

from apps.core.exceptions import exception_handler
from apps.core.models import AuditLog, School
from apps.core.schema import strip_database_integer_bounds
from apps.users.models import SchoolMembership, User

SCHEMA_FILE = Path(settings.BASE_DIR).parent / "docs" / "api" / "openapi.yaml"
PASSWORD = "bezpieczne-haslo-123"


@pytest.fixture
def school() -> School:
    return School.objects.create(name="Szkoła Testowa", city="Warszawa")


@pytest.fixture
def member(school: School) -> User:
    user = User.objects.create_user(email="sekretariat@example.com", password=PASSWORD)
    SchoolMembership.objects.create(
        user=user, school=school, role=SchoolMembership.Role.ADMIN, is_active=True
    )
    return user


@pytest.fixture
def client(member: User, school: School) -> APIClient:
    api = APIClient()
    api.force_login(member)
    api.credentials(HTTP_X_SCHOOL_ID=str(school.id))
    return api


def make_logs(school: School, actor: User, count: int, **fields) -> None:
    for index in range(count):
        log = AuditLog.objects.create(
            school=school,
            actor=actor,
            action=fields.get("action", AuditLog.Action.UPDATE),
            target_type=fields.get("target_type", "Student"),
            target_id=str(index),
        )
        # auto_now_add ignores the value passed to create(), so set it afterwards.
        AuditLog.objects.filter(pk=log.pk).update(
            created_at=timezone.now() - timedelta(minutes=index)
        )


@pytest.mark.django_db
class TestErrorFormat:
    def test_unauthenticated(self) -> None:
        response = APIClient().get("/api/auth/me/")

        assert response.status_code == 401
        assert response.json() == {
            "code": "not_authenticated",
            "detail": response.json()["detail"],
        }

    def test_field_validation_errors(self) -> None:
        api = APIClient()
        response = api.post(
            "/api/auth/login/", {"email": "to-nie-email"}, format="json"
        )

        body = response.json()
        assert response.status_code == 400
        assert body["code"] == "validation_error"
        assert body["detail"] == "Popraw zaznaczone pola formularza."
        assert set(body["field_errors"]) == {"email", "password"}

    def test_non_field_error_becomes_detail(self, member: User) -> None:
        response = APIClient().post(
            "/api/auth/login/",
            {"email": member.email, "password": "zle-haslo"},
            format="json",
        )

        body = response.json()
        assert body["code"] == "validation_error"
        assert body["detail"] == "Nieprawidłowy adres e-mail lub hasło."
        assert "field_errors" not in body

    def test_login_without_csrf_token(self, member: User) -> None:
        api = APIClient(enforce_csrf_checks=True)
        response = api.post(
            "/api/auth/login/",
            {"email": member.email, "password": PASSWORD},
            format="json",
        )

        assert response.status_code == 403
        assert response.json()["code"] == "csrf_failed"

    def test_session_request_without_csrf_token(self, member: User) -> None:
        api = APIClient(enforce_csrf_checks=True)
        api.force_login(member)

        response = api.post("/api/auth/logout/")

        assert response.status_code == 403
        assert response.json()["code"] == "csrf_failed"

    def test_not_found(self, client: APIClient) -> None:
        response = client.get("/api/audit-logs/00000000-0000-0000-0000-000000000000/")

        assert response.status_code == 404
        assert response.json()["code"] == "not_found"

    def test_method_not_allowed(self, client: APIClient) -> None:
        response = client.post("/api/audit-logs/", {}, format="json")

        assert response.status_code == 405
        assert response.json()["code"] == "method_not_allowed"

    def test_unknown_api_url_returns_json(self, client: APIClient) -> None:
        response = client.get("/api/nie-ma-takiego-adresu/")

        assert response.status_code == 404
        assert response.json()["code"] == "not_found"

    def test_unknown_api_url_returns_json_in_debug_mode(
        self, client: APIClient, settings
    ) -> None:
        settings.DEBUG = True

        response = client.get("/api/nie-ma-takiego-adresu/")

        assert response.status_code == 404
        assert response["Content-Type"] == "application/json"
        assert response.json()["code"] == "not_found"

    def test_unexpected_exception_returns_server_error(self) -> None:
        response = exception_handler(RuntimeError("boom"), {})

        assert response is not None
        assert response.status_code == 500
        assert response.data == {
            "code": "server_error",
            "detail": "Wystąpił błąd serwera. Spróbuj ponownie później.",
        }

    def test_nested_validation_errors_are_flattened(self) -> None:
        exc = exceptions.ValidationError(
            {"guardians": [{}, {"phone": ["Błędny numer."]}], "pesel": ["Zły PESEL."]}
        )

        response = exception_handler(exc, {})

        assert response is not None
        assert response.data["field_errors"] == {
            "guardians.1.phone": ["Błędny numer."],
            "pesel": ["Zły PESEL."],
        }


@pytest.mark.django_db
class TestSchoolHeader:
    def test_missing_school_header_is_forbidden(self, member: User) -> None:
        api = APIClient()
        api.force_login(member)

        assert api.get("/api/audit-logs/").status_code == 403

    def test_malformed_school_header_is_forbidden_not_500(self, member: User) -> None:
        api = APIClient()
        api.force_login(member)

        response = api.get("/api/audit-logs/", HTTP_X_SCHOOL_ID="to-nie-uuid")

        assert response.status_code == 403
        assert response.json()["code"] == "permission_denied"


@pytest.mark.django_db
class TestPagination:
    def test_default_page(
        self, client: APIClient, school: School, member: User
    ) -> None:
        make_logs(school, member, 30)

        body = client.get("/api/audit-logs/").json()

        assert body["count"] == 30
        assert body["page"] == 1
        assert body["page_size"] == 25
        assert body["total_pages"] == 2
        assert len(body["results"]) == 25

    def test_page_and_page_size(
        self, client: APIClient, school: School, member: User
    ) -> None:
        make_logs(school, member, 30)

        body = client.get("/api/audit-logs/", {"page": 3, "page_size": 10}).json()

        assert body["page"] == 3
        assert body["total_pages"] == 3
        assert len(body["results"]) == 10

    def test_page_size_is_capped(
        self, client: APIClient, school: School, member: User
    ) -> None:
        make_logs(school, member, 3)

        body = client.get("/api/audit-logs/", {"page_size": 1000}).json()

        assert body["page_size"] == 100

    def test_page_out_of_range(self, client: APIClient) -> None:
        response = client.get("/api/audit-logs/", {"page": 99})

        assert response.status_code == 404
        assert response.json()["code"] == "not_found"

    def test_no_absolute_urls_in_response(self, client: APIClient) -> None:
        body = client.get("/api/audit-logs/").json()

        assert "next" not in body
        assert "previous" not in body


@pytest.mark.django_db
class TestFiltering:
    def test_filter_by_action(
        self, client: APIClient, school: School, member: User
    ) -> None:
        make_logs(school, member, 2, action=AuditLog.Action.LOGIN)
        make_logs(school, member, 3, action=AuditLog.Action.DELETE)

        body = client.get("/api/audit-logs/", {"action": "login"}).json()

        assert body["count"] == 2
        assert {row["action"] for row in body["results"]} == {"login"}

    def test_invalid_filter_value_is_validation_error(self, client: APIClient) -> None:
        response = client.get("/api/audit-logs/", {"action": "nieznana"})

        assert response.status_code == 400
        assert "action" in response.json()["field_errors"]

    def test_search(self, client: APIClient, school: School, member: User) -> None:
        make_logs(school, member, 2, target_type="Student")
        make_logs(school, member, 1, target_type="Guardian")

        body = client.get("/api/audit-logs/", {"search": "guard"}).json()

        assert body["count"] == 1

    def test_ordering(self, client: APIClient, school: School, member: User) -> None:
        make_logs(school, member, 3)

        newest_first = client.get("/api/audit-logs/").json()["results"]
        oldest_first = client.get(
            "/api/audit-logs/", {"ordering": "created_at"}
        ).json()["results"]

        assert [row["id"] for row in oldest_first] == [
            row["id"] for row in reversed(newest_first)
        ]

    def test_other_school_data_is_not_listed(
        self, client: APIClient, member: User
    ) -> None:
        other = School.objects.create(name="Inna szkoła", city="Kraków")
        make_logs(other, member, 4)

        assert client.get("/api/audit-logs/").json()["count"] == 0


@pytest.mark.django_db
class TestOpenApiSchema:
    def test_schema_endpoint_is_public(self) -> None:
        response = APIClient().get("/api/schema/", HTTP_ACCEPT="application/json")

        assert response.status_code == 200
        assert response.json()["info"]["title"] == "TechniŚwiadectwo API"

    def test_docs_ui_is_served(self) -> None:
        assert APIClient().get("/api/docs/").status_code == 200

    def test_committed_schema_is_up_to_date(self) -> None:
        schema = SchemaGenerator().get_schema(request=None, public=True)
        validate_schema(schema)
        generated = OpenApiYamlRenderer().render(schema, renderer_context={}).decode()

        committed = SCHEMA_FILE.read_text(encoding="utf-8").replace("\r\n", "\n")
        assert generated == committed, (
            "docs/api/openapi.yaml jest nieaktualny. Wygeneruj go poleceniem: "
            "npm run api:schema"
        )

    def test_schema_does_not_depend_on_database_backend(self) -> None:
        schema = {
            "sqlite": {
                "type": "integer",
                "format": "int64",
                "minimum": -(2**63),
                "maximum": 2**63 - 1,
            },
            "postgres": {"type": "integer", "minimum": -(2**31), "maximum": 2**31 - 1},
            "explicit": {"type": "integer", "minimum": 1, "maximum": 8},
        }

        result = strip_database_integer_bounds(schema)

        assert result["sqlite"] == {"type": "integer"}
        assert result["postgres"] == {"type": "integer"}
        assert result["explicit"] == {"type": "integer", "minimum": 1, "maximum": 8}

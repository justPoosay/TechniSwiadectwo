import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

User = get_user_model()

PASSWORD = "bezpieczne-haslo-123"


@pytest.fixture
def user():
    return User.objects.create_user(email="sekretariat@example.com", password=PASSWORD)


@pytest.fixture
def client() -> APIClient:
    # Enforce CSRF like a real browser does.
    return APIClient(enforce_csrf_checks=True)


def fetch_csrf_token(client: APIClient) -> str:
    response = client.get(reverse("users:csrf"))
    assert response.status_code == 204
    return response.cookies["csrftoken"].value


def login(client: APIClient, email: str, password: str):
    token = fetch_csrf_token(client)
    return client.post(
        reverse("users:login"),
        {"email": email, "password": password},
        format="json",
        HTTP_X_CSRFTOKEN=token,
    )


@pytest.mark.django_db
class TestCsrf:
    def test_csrf_endpoint_sets_js_readable_cookie(self, client: APIClient) -> None:
        response = client.get(reverse("users:csrf"))

        assert response.status_code == 204
        cookie = response.cookies["csrftoken"]
        assert cookie.value
        assert not cookie["httponly"]
        assert cookie["samesite"] == "Lax"

    def test_login_without_csrf_token_is_rejected(
        self, client: APIClient, user
    ) -> None:
        response = client.post(
            reverse("users:login"),
            {"email": user.email, "password": PASSWORD},
            format="json",
        )

        assert response.status_code == 403
        assert "sessionid" not in response.cookies

    def test_logout_without_csrf_token_is_rejected(
        self, client: APIClient, user
    ) -> None:
        assert login(client, user.email, PASSWORD).status_code == 200

        response = client.post(reverse("users:logout"))

        assert response.status_code == 403


@pytest.mark.django_db
class TestSessionFlow:
    def test_login_sets_httponly_session_cookie(self, client: APIClient, user) -> None:
        response = login(client, user.email, PASSWORD)

        assert response.status_code == 200
        assert response.json()["email"] == user.email
        session = response.cookies["sessionid"]
        assert session["httponly"]
        assert session["samesite"] == "Lax"
        assert "password" not in response.json()

    def test_login_with_wrong_password_returns_400(
        self, client: APIClient, user
    ) -> None:
        response = login(client, user.email, "zle-haslo")

        assert response.status_code == 400
        assert "sessionid" not in response.cookies

    def test_me_returns_current_user_after_login(self, client: APIClient, user) -> None:
        login(client, user.email, PASSWORD)

        response = client.get(reverse("users:current-user"))

        assert response.status_code == 200
        assert response.json()["email"] == user.email

    def test_logout_ends_session(self, client: APIClient, user) -> None:
        login(client, user.email, PASSWORD)
        # Login rotates the CSRF token, so the new cookie value must be used.
        token = client.cookies["csrftoken"].value

        response = client.post(reverse("users:logout"), HTTP_X_CSRFTOKEN=token)

        assert response.status_code == 200
        assert client.get(reverse("users:current-user")).status_code == 401


@pytest.mark.django_db
class TestUnauthenticated:
    def test_me_returns_401_with_non_basic_challenge(self, client: APIClient) -> None:
        response = client.get(reverse("users:current-user"))

        assert response.status_code == 401
        # A Basic challenge would make browsers pop up a native login dialog.
        assert not response["WWW-Authenticate"].lower().startswith("basic")

    def test_health_is_public(self, client: APIClient) -> None:
        response = client.get(reverse("core:health"))

        assert response.status_code == 200

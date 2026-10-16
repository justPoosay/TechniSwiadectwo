from django.conf import settings
from drf_spectacular.extensions import OpenApiAuthenticationExtension


class SessionAuthenticationScheme(OpenApiAuthenticationExtension):
    """Describes apps.users.authentication.SessionAuthentication in OpenAPI."""

    target_class = "apps.users.authentication.SessionAuthentication"
    name = "sessionAuth"

    def get_security_definition(self, auto_schema):  # type: ignore[no-untyped-def]
        return {
            "type": "apiKey",
            "in": "cookie",
            "name": settings.SESSION_COOKIE_NAME,
            "description": (
                "Sesja Django ustawiana przez `POST /api/auth/login/` (cookie HttpOnly). "
                "Żądania zmieniające dane wymagają nagłówka `X-CSRFToken` "
                "z wartością cookie `csrftoken` (`GET /api/auth/csrf/`)."
            ),
        }

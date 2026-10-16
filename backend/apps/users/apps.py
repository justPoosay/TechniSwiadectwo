from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.users"
    verbose_name = "Użytkownicy"

    def ready(self) -> None:
        # Registers the OpenAPI extension for our SessionAuthentication.
        from apps.users import schema  # noqa: F401

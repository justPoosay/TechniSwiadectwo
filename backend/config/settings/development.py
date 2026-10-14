from .base import *  # noqa: F403

SECRET_KEY = "development-only-secret-key"
DEBUG = True
# "backend" is the hostname the Next.js proxy uses inside docker-compose.
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,backend")  # noqa: F405
SESSION_COOKIE_SECURE = False

CSRF_TRUSTED_ORIGINS = env_list(  # noqa: F405
    "DJANGO_CSRF_TRUSTED_ORIGINS", "http://localhost:3000"
)

import os

from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F403

if not SECRET_KEY:  # noqa: F405
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set in production.")

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS")  # noqa: F405

SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = int(os.getenv("DJANGO_SECURE_HSTS_SECONDS", "3600"))
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

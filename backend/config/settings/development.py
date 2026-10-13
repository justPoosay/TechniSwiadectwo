from .base import *  # noqa: F403

SECRET_KEY = "development-only-secret-key"
DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1"]
SESSION_COOKIE_SECURE=False

CORS_ALLOW_ORIGINS = [
    'http://localhost:3000',
]

CORS_TRUSTED_ORIGINS = [
    'http://localhost:3000',
]

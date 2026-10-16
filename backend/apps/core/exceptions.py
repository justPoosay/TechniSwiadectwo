"""Unified API error format.

Every error returned by the API has the same shape (documented in OpenAPI as
``ErrorResponse``)::

    {
        "code": "validation_error",
        "detail": "Popraw zaznaczone pola formularza.",
        "field_errors": {"email": ["Wprowadź poprawny adres e-mail."]}
    }

``code`` is a stable, machine-readable identifier, ``detail`` a message that can
be shown to the user, ``field_errors`` is present only for validation errors.
"""

import logging
from typing import Any

from django.conf import settings
from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.http import Http404
from rest_framework import exceptions
from rest_framework.response import Response
from rest_framework.settings import api_settings
from rest_framework.views import exception_handler as drf_exception_handler

from apps.core.errors import (
    SERVER_ERROR_CODE,
    SERVER_ERROR_DETAIL,
    VALIDATION_ERROR_CODE,
    VALIDATION_ERROR_DETAIL,
    error_body,
)

logger = logging.getLogger(__name__)


def _flatten(data: Any, prefix: str = "") -> dict[str, list[str]]:
    """Turn nested DRF errors into ``{"guardians.0.phone": ["..."]}``."""
    if isinstance(data, dict):
        result: dict[str, list[str]] = {}
        for key, value in data.items():
            result.update(_flatten(value, f"{prefix}.{key}" if prefix else str(key)))
        return result
    if isinstance(data, list) and any(isinstance(item, dict | list) for item in data):
        result = {}
        for index, item in enumerate(data):
            result.update(_flatten(item, f"{prefix}.{index}" if prefix else str(index)))
        return result
    messages = [str(item) for item in data] if isinstance(data, list) else [str(data)]
    return {prefix: messages} if messages else {}


def _validation_error_body(detail: Any) -> dict[str, Any]:
    if isinstance(detail, list):
        messages = [str(item) for item in detail]
        return error_body(VALIDATION_ERROR_CODE, messages[0] if messages else "")

    field_errors = _flatten(detail)
    general = field_errors.pop(api_settings.NON_FIELD_ERRORS_KEY, [])
    message = general[0] if general else VALIDATION_ERROR_DETAIL
    return error_body(VALIDATION_ERROR_CODE, message, field_errors)


def exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    if isinstance(exc, Http404):
        exc = exceptions.NotFound()
    elif isinstance(exc, DjangoPermissionDenied):
        exc = exceptions.PermissionDenied()

    response = drf_exception_handler(exc, context)

    if response is None:
        # Unexpected exception: keep Django's debug page in development.
        if settings.DEBUG:
            return None
        logger.exception("Unhandled API exception", exc_info=exc)
        return Response(error_body(SERVER_ERROR_CODE, SERVER_ERROR_DETAIL), status=500)

    if isinstance(exc, exceptions.ValidationError):
        response.data = _validation_error_body(exc.detail)
    elif isinstance(exc, exceptions.APIException):
        codes = exc.get_codes()
        code = codes if isinstance(codes, str) else exc.default_code
        if isinstance(exc.detail, dict | list):
            response.data = _validation_error_body(exc.detail) | {"code": code}
        else:
            response.data = error_body(code, str(exc.detail))
    return response

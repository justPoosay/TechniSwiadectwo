from rest_framework import authentication, exceptions
from rest_framework.request import Request

from apps.core.errors import CSRF_FAILED_CODE, CSRF_FAILED_DETAIL


class SessionAuthentication(authentication.SessionAuthentication):
    """Session auth that answers 401 (not 403) for anonymous requests.

    DRF only returns 401 when the first authenticator provides a
    WWW-Authenticate challenge. A custom "Session" scheme lets the frontend tell
    "not logged in" (401) from "logged in, but forbidden" (403) without the
    browser showing a Basic auth dialog.
    """

    def authenticate_header(self, request: Request) -> str:
        return 'Session realm="api"'

    def enforce_csrf(self, request: Request) -> None:
        # Same code and message as CSRF_FAILURE_VIEW, instead of DRF's English
        # "CSRF Failed: ..." with the generic permission_denied code.
        try:
            super().enforce_csrf(request)
        except exceptions.PermissionDenied as error:
            raise exceptions.PermissionDenied(
                CSRF_FAILED_DETAIL, code=CSRF_FAILED_CODE
            ) from error

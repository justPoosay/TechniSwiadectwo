from rest_framework import authentication
from rest_framework.request import Request


class SessionAuthentication(authentication.SessionAuthentication):
    """Session auth that answers 401 (not 403) for anonymous requests.

    DRF only returns 401 when the first authenticator provides a
    WWW-Authenticate challenge. A custom "Session" scheme lets the frontend tell
    "not logged in" (401) from "logged in, but forbidden" (403) without the
    browser showing a Basic auth dialog.
    """

    def authenticate_header(self, request: Request) -> str:
        return 'Session realm="api"'

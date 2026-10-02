from collections.abc import Callable
from typing import cast

from django.http import HttpRequest, HttpResponse

from apps.core.types import AuthenticatedSchoolRequest
from apps.users.models import SchoolMembership


class ActiveSchoolMiddleware:
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        req = cast(AuthenticatedSchoolRequest, request)
        req.school = None
        req.school_membership = None

        if req.user.is_authenticated:
            school_id = req.headers.get("X-School-ID") or req.GET.get("school_id")

            if school_id:
                membership = (
                    SchoolMembership.objects.filter(
                        user=req.user, school_id=school_id, is_active=True
                    )
                    .select_related("school")
                    .first()
                )

                if membership:
                    req.school = membership.school
                    req.school_membership = membership

        return self.get_response(req)

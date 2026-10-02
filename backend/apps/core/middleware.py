from collections.abc import Callable

from django.http import HttpRequest, HttpResponse

from apps.users.models import SchoolMembership


class ActiveSchoolMiddleware:
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        request.school = None
        request.school_membership = None

        if request.user.is_authenticated:
            school_id = request.headers.get("X-School-ID") or request.GET.get(
                "school_id"
            )

            if school_id:
                membership = (
                    SchoolMembership.objects.filter(
                        user=request.user, school_id=school_id, is_active=True
                    )
                    .select_related("school")
                    .first()
                )

                if membership:
                    request.school = membership.school
                    request.school_membership = membership

        return self.get_response(request)

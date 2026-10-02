from django.http import HttpRequest

from apps.core.models import School
from apps.users.models import SchoolMembership


class AuthenticatedSchoolRequest(HttpRequest):
    school: School | None
    school_membership: SchoolMembership | None

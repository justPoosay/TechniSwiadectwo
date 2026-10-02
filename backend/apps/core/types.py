from apps.core.models import School
from apps.users.models import SchoolMembership


class AuthenticatedSchoolRequest:
    school: School | None
    school_membership: SchoolMembership | None

from rest_framework import permissions

ROLE_FORBIDDEN_DETAIL = "Twoja rola w tej szkole nie ma dostępu do tego zasobu."


class IsSchoolMember(permissions.BasePermission):
    def has_permission(self, request, view) -> bool:
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_superuser:
            return True
        return getattr(request, "school", None) is not None

    def has_object_permission(self, request, view, obj) -> bool:
        if request.user.is_superuser:
            return True

        school_id = getattr(obj, "school_id", None)
        active_school = getattr(request, "school", None)

        if school_id and active_school:
            return bool(school_id == active_school.id)
        return False


class HasSchoolRole(IsSchoolMember):
    """IsSchoolMember + the role in the active school must be in ``view.allowed_roles``.

    Views without ``allowed_roles`` are open to every member of the school.
    The access matrix is documented in docs/permissions.md.
    """

    message = ROLE_FORBIDDEN_DETAIL

    def has_permission(self, request, view) -> bool:
        if not super().has_permission(request, view):
            return False
        allowed_roles = getattr(view, "allowed_roles", None)
        if allowed_roles is None or request.user.is_superuser:
            return True
        membership = getattr(request, "school_membership", None)
        return membership is not None and membership.role in allowed_roles

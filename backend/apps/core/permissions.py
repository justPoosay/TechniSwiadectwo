from rest_framework import permissions


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
            return school_id == active_school.id
        return False

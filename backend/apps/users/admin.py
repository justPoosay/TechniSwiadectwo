from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from apps.core.models import AuditLog
from apps.users.models import SchoolMembership, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ("email",)
    list_display = (
        "email",
        "first_name",
        "last_name",
        "is_active",
        "is_staff",
        "date_joined",
    )
    list_filter = ("is_active", "is_staff", "is_superuser")
    search_fields = ("email", "first_name", "last_name")
    readonly_fields = ("date_joined", "last_active_at", "last_login")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (_("Dane osobowe"), {"fields": ("first_name", "last_name")}),
        (
            _("Uprawnienia"),
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        (_("Aktywność"), {"fields": ("date_joined", "last_login", "last_active_at")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "first_name",
                    "last_name",
                    "password1",
                    "password2",
                ),
            },
        ),
    )


@admin.register(SchoolMembership)
class SchoolMembershipAdmin(admin.ModelAdmin):
    list_display = ("user", "school", "role", "is_active", "created_at")
    list_filter = ("role", "is_active", "school")
    search_fields = (
        "user__email",
        "user__first_name",
        "user__last_name",
        "school__name",
    )
    raw_id_fields = ("user", "school")


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "school",
        "actor",
        "action",
        "target_type",
        "target_id",
        "ip_address",
    )
    list_filter = ("action", "target_type", "school", "created_at")
    search_fields = ("actor__email", "target_id", "changes")
    ordering = ("-created_at",)

    def has_add_permission(self, request) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        return False

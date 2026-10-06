from typing import Any

from django.db import models

from apps.core.models import AuditLog
from apps.core.types import AuthenticatedSchoolRequest


def get_client_ip(request: AuthenticatedSchoolRequest) -> str | None:
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def log_audit_event(
    request: AuthenticatedSchoolRequest,
    action: AuditLog.Action | str,
    target: models.Model,
    changes: dict[str, Any] | None = None,
) -> AuditLog | None:
    if not getattr(request, "school", None):
        return None

    actor = request.user if request.user.is_authenticated else None

    return AuditLog.objects.create(
        school=request.school,
        actor=actor,
        action=action,
        target_type=target.__class__.__name__,
        target_id=str(target.pk),
        changes=changes or {},
        ip_address=get_client_ip(request),
    )

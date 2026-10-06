from typing import Any

from django.db import models

from apps.core.models import AuditLog
from apps.core.types import AuthenticatedSchoolRequest


def get_client_ip(request: AuthenticatedSchoolRequest) -> str | None:
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if isinstance(x_forwarded_for, str) and x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()

    remote_addr = request.META.get("REMOTE_ADDR")
    if isinstance(remote_addr, str):
        return remote_addr

    return None


def log_audit_event(
    request: AuthenticatedSchoolRequest,
    action: AuditLog.Action | str,
    target: models.Model,
    changes: dict[str, Any] | None = None,
) -> AuditLog | None:
    school = getattr(request, "school", None)
    if school is None:
        return None

    actor = request.user if request.user.is_authenticated else None

    return AuditLog.objects.create(
        school=school,
        actor=actor,
        action=action,
        target_type=target.__class__.__name__,
        target_id=str(target.pk),
        changes=changes or {},
        ip_address=get_client_ip(request),
    )

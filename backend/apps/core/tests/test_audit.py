import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.core.models import AuditLog, School
from apps.core.services.audit import log_audit_event
from apps.users.models import SchoolMembership, User


@pytest.mark.django_db
class TestAuditLog:
    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.school = School.objects.create(name="Szkoła Testowa")
        self.user = User.objects.create_user(
            email="admin@szkola.pl",
            password="password123",
            first_name="Jan",
            last_name="Kowalski",
        )
        SchoolMembership.objects.create(
            user=self.user,
            school=self.school,
            role=SchoolMembership.Role.ADMIN,
            is_active=True,
        )
        self.client = APIClient()

    def test_log_audit_event_service(self, rf):
        request = rf.get("/")
        request.user = self.user
        request.school = self.school

        log_entry = log_audit_event(
            request=request,
            action=AuditLog.Action.CREATE,
            target=self.school,
            changes={"name": "Nowa nazwa"},
        )

        assert log_entry is not None
        assert log_entry.actor == self.user
        assert log_entry.school == self.school
        assert log_entry.target_type == "School"
        assert log_entry.changes == {"name": "Nowa nazwa"}

    def test_audit_log_api_read_only(self):
        self.client.force_login(self.user)
        audit = AuditLog.objects.create(
            school=self.school,
            actor=self.user,
            action=AuditLog.Action.DELETE,
            target_type="Student",
            target_id="123",
        )

        url = f"/api/audit-logs/{audit.id}/"

        response_put = self.client.put(
            url, {"action": "UPDATE"}, HTTP_X_SCHOOL_ID=str(self.school.id)
        )
        assert response_put.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

        response_delete = self.client.delete(url, HTTP_X_SCHOOL_ID=str(self.school.id))
        assert response_delete.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

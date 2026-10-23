import pytest
from django.core.management import CommandError, call_command

from apps.core.management.commands.seed_e2e import FOREIGN_STUDENT_ID, USERS
from apps.students.models import Student
from apps.users.models import SchoolMembership, User


@pytest.mark.django_db
class TestSeedE2E:
    def test_refuses_to_run_without_debug(self, settings) -> None:
        settings.DEBUG = False

        with pytest.raises(CommandError, match="DEBUG"):
            call_command("seed_e2e")

    def test_is_idempotent(self, settings) -> None:
        settings.DEBUG = True

        call_command("seed_e2e")
        call_command("seed_e2e")

        assert User.objects.filter(email__in=USERS).count() == len(USERS)
        assert SchoolMembership.objects.filter(user__email__in=USERS).count() == len(
            USERS
        )
        assert Student.objects.filter(school__name="E2E Szkoła A").count() == 3
        foreign = Student.objects.get(pk=FOREIGN_STUDENT_ID)
        assert foreign.school.name == "E2E Szkoła B"

    def test_creates_one_account_per_role(self, settings) -> None:
        settings.DEBUG = True

        call_command("seed_e2e")

        roles = set(
            SchoolMembership.objects.filter(user__email__in=USERS).values_list(
                "role", flat=True
            )
        )
        assert roles == set(SchoolMembership.Role)
        user = User.objects.get(email="e2e-dyrekcja@szkola-a.test")
        assert user.check_password("e2e-Haslo-Testowe-1")

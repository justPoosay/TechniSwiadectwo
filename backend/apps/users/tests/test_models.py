import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError

from apps.core.models import School
from apps.users.models import SchoolMembership

User = get_user_model()


@pytest.mark.django_db
class TestUser:
    def test_create_user(self) -> None:
        user = User.objects.create_user(
            email="jan@example.com",
            password="haslo123",
            first_name="Jan",
            last_name="Kowalski",
        )
        assert user.email == "jan@example.com"
        assert user.first_name == "Jan"
        assert user.last_name == "Kowalski"
        assert user.is_active is True
        assert user.is_staff is False
        assert user.is_superuser is False
        assert user.check_password("haslo123")

    def test_create_user_normalizes_email(self) -> None:
        # normalize_email lowercases only the domain part (RFC-compliant)
        user = User.objects.create_user(email="Jan@EXAMPLE.COM", password="x")
        assert user.email == "Jan@example.com"

    def test_create_user_without_email_raises(self) -> None:
        with pytest.raises(ValueError, match="Adres e-mail jest wymagany"):
            User.objects.create_user(email="", password="x")

    def test_create_superuser(self) -> None:
        user = User.objects.create_superuser(
            email="admin@example.com",
            password="admin123",
            first_name="Admin",
            last_name="Test",
        )
        assert user.is_staff is True
        assert user.is_superuser is True
        assert user.is_active is True

    def test_create_superuser_without_is_staff_raises(self) -> None:
        with pytest.raises(ValueError, match="is_staff=True"):
            User.objects.create_superuser(
                email="x@example.com",
                password="x",
                is_staff=False,
            )

    def test_get_full_name(self) -> None:
        user = User(first_name="Anna", last_name="Nowak")
        assert user.get_full_name() == "Anna Nowak"

    def test_get_full_name_strips_whitespace(self) -> None:
        user = User(first_name="Anna", last_name="")
        assert user.get_full_name() == "Anna"

    def test_str(self) -> None:
        user = User(email="test@example.com")
        assert str(user) == "test@example.com"

    def test_uuid_primary_key(self) -> None:
        user = User.objects.create_user(email="uuid@example.com", password="x")
        assert user.pk is not None
        assert str(user.pk).count("-") == 4  # UUID format

    def test_last_active_at_defaults_to_none(self) -> None:
        user = User.objects.create_user(email="active@example.com", password="x")
        assert user.last_active_at is None


@pytest.mark.django_db
class TestSchoolMembership:
    def test_role_choices_cover_all_roles(self) -> None:
        role_values = {r.value for r in SchoolMembership.Role}
        assert role_values == {
            "secretariat",
            "teacher",
            "homeroom_teacher",
            "principal",
            "admin",
        }

    def test_create_membership(self) -> None:
        school = School.objects.create(name="Technikum nr 1", city="Warszawa")
        user = User.objects.create_user(
            email="nauczyciel@example.com",
            password="x",
            first_name="Anna",
            last_name="Nowak",
        )
        membership = SchoolMembership.objects.create(
            user=user,
            school=school,
            role=SchoolMembership.Role.TEACHER,
        )
        assert membership.role == SchoolMembership.Role.TEACHER
        assert membership.is_active is True
        assert membership.id is not None

    def test_membership_str(self) -> None:
        school = School.objects.create(name="Szkoła Y", city="Kraków")
        user = User.objects.create_user(email="x@example.com", password="x")
        membership = SchoolMembership.objects.create(
            user=user,
            school=school,
            role=SchoolMembership.Role.PRINCIPAL,
        )
        assert str(membership) == "x@example.com | Szkoła Y | Dyrekcja"

    def test_unique_user_school_constraint(self) -> None:
        school = School.objects.create(name="Szkoła Z", city="Gdańsk")
        user = User.objects.create_user(email="dup@example.com", password="x")
        SchoolMembership.objects.create(
            user=user, school=school, role=SchoolMembership.Role.TEACHER
        )
        with pytest.raises(IntegrityError):
            SchoolMembership.objects.create(
                user=user, school=school, role=SchoolMembership.Role.ADMIN
            )

    def test_user_can_belong_to_multiple_schools(self) -> None:
        school_a = School.objects.create(name="Szkoła A", city="Warszawa")
        school_b = School.objects.create(name="Szkoła B", city="Kraków")
        user = User.objects.create_user(email="multi@example.com", password="x")
        SchoolMembership.objects.create(
            user=user, school=school_a, role=SchoolMembership.Role.TEACHER
        )
        SchoolMembership.objects.create(
            user=user, school=school_b, role=SchoolMembership.Role.HOMEROOM_TEACHER
        )
        assert user.memberships.count() == 2

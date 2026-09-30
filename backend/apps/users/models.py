from __future__ import annotations

import uuid

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone

from apps.users.managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, verbose_name="Adres e-mail")
    first_name = models.CharField(max_length=150, verbose_name="Imię")
    last_name = models.CharField(max_length=150, verbose_name="Nazwisko")
    is_active = models.BooleanField(default=True, verbose_name="Aktywne konto")
    is_staff = models.BooleanField(
        default=False, verbose_name="Dostęp do panelu admina"
    )
    date_joined = models.DateTimeField(
        default=timezone.now, verbose_name="Data dołączenia"
    )
    last_active_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Ostatnia aktywność",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    objects: UserManager = UserManager()

    class Meta:
        verbose_name = "Użytkownik"
        verbose_name_plural = "Użytkownicy"

    def __str__(self) -> str:
        return self.email

    def get_full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


class SchoolMembership(models.Model):
    class Role(models.TextChoices):
        SECRETARIAT = "secretariat", "Sekretariat"
        TEACHER = "teacher", "Nauczyciel"
        HOMEROOM_TEACHER = "homeroom_teacher", "Wychowawca"
        PRINCIPAL = "principal", "Dyrekcja"
        ADMIN = "admin", "Administrator"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="memberships",
        verbose_name="Użytkownik",
    )
    school = models.ForeignKey(
        "core.School",
        on_delete=models.CASCADE,
        related_name="memberships",
        verbose_name="Szkoła",
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        verbose_name="Rola",
    )
    is_active = models.BooleanField(default=True, verbose_name="Aktywne")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Data dodania")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "school"],
                name="unique_user_school_membership",
            )
        ]
        verbose_name = "Członkostwo w szkole"
        verbose_name_plural = "Członkostwa w szkołach"

    def __str__(self) -> str:
        return f"{self.user} | {self.school} | {self.get_role_display()}"

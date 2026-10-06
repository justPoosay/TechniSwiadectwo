import uuid

from django.conf import settings
from django.db import models


class School(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name="Nazwa Szkoły")
    city = models.CharField(max_length=100, verbose_name="Miasto")
    rspo = models.CharField(
        max_length=8, verbose_name="Numer RSPO", blank=True
    )  # blank true for development
    regon = models.CharField(
        max_length=14, verbose_name="Numer Regon", blank=True
    )  # blank true for development
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Szkoła"
        verbose_name_plural = "Szkoły"

    def __str__(self):
        return self.name


class AcademicYear(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school = models.ForeignKey(
        School, on_delete=models.CASCADE, related_name="academic_years"
    )
    name = models.CharField(max_length=9, verbose_name="Rok Szkolny")  # fe. 2026/2027
    start_date = models.DateField(verbose_name="Data Rozpoczęcia")
    end_date = models.DateField(verbose_name="Data zakończenia")
    is_current = models.BooleanField(default=False, verbose_name="Bieżący rok")

    class Meta:
        verbose_name = "Rok Szkolny"
        verbose_name_plural = "Lata Szkolne"
        constraints = [
            models.UniqueConstraint(
                fields=["school", "name"], name="unique_academic_year"
            )  # Nie może być 2 takich samych roków szkolnych w systemie
        ]

    def __str__(self):
        return f"{self.school.name} | {self.name}"


class Cohort(models.Model):  # Since "class" is restricted :(
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="cohorts")
    academic_year = models.ForeignKey(
        AcademicYear, on_delete=models.CASCADE, related_name="cohorts"
    )
    name = models.CharField(max_length=10, verbose_name="Nazwa Klasy")  # np. 4A
    level = models.IntegerField(verbose_name="Poziom")  # np. 4

    class Meta:
        verbose_name = "Klasa"
        verbose_name_plural = "Klasy"
        constraints = [
            models.UniqueConstraint(
                fields=["school", "academic_year", "name"], name="unique_class_per_year"
            )
        ]

    def __str__(self):
        return f"Klasa {self.name} {self.academic_year.name}"


class SchoolScopedQuerySet(models.QuerySet):
    # Filtrowanie obiektów pod wzgl szkoly
    def for_schools(self, school):
        if not school:
            return self.none()
        return self.filter(school=school)

    def for_user(self, user):
        if not user or not user.is_authenticated:
            return self.none()
        if user.is_superuser:
            return self.all()
        return self.filter(
            school__memberships__user=user, school__membership__is__active=True
        ).distinct()


class ScopedSchoolModel(models.Model):
    school = models.ForeignKey(
        "core.school",
        on_delete=models.CASCADE,
        related_name="%(app_label)s_$(class)s_set",
        verbose_name="Szkoła",
    )

    objects = SchoolScopedQuerySet.as_manager()

    class Meta:
        abstract = True


class AuditLog(models.Model):
    class Action(models.TextChoices):
        CREATE = "create", "Tworzenie"
        UPDATE = "update", "Edycja"
        DELETE = "delete", "Usuwanie"
        LOGIN = "login", "Logowanie"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school = models.ForeignKey(
        "core.School",
        on_delete=models.CASCADE,
        related_name="audit_logs",
        verbose_name="Szkoła",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_actions",
        verbose_name="Aktor",
    )
    action = models.CharField(
        max_length=20,
        choices=Action.choices,
        verbose_name="Operacja",
    )
    target_type = models.CharField(
        max_length=100,
        verbose_name="Typ obiektu",
    )
    target_id = models.CharField(
        max_length=255,
        verbose_name="Identyfikator obiektu",
    )
    changes = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Bezpieczny opis zmian",
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name="Adres IP",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Czas zdarzenia",
    )

    class Meta:
        verbose_name = "Wpis audytowy"
        verbose_name_plural = "Wpisy audytowe"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"[{self.created_at:%Y-%m-%d %H:%M}] {self.actor} -> {self.action} {self.target_type} ({self.target_id})"

import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.students.validators import validate_pesel


class Teacher(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school = models.ForeignKey(
        "core.School",
        on_delete=models.CASCADE,
        related_name="teachers",
        verbose_name="Szkoła",
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="teacher_profile",
        verbose_name="Konto użytkownika",
        help_text="Konto użytkownika w systemie (opcjonalne)",
    )

    academic_title = models.CharField(
        "Tytuł / Tytuł zawodowy",
        max_length=30,
        blank=True,
        default="",
        help_text="np. mgr, dr, mgr inż.",
    )
    first_name = models.CharField("Imię", max_length=100)
    last_name = models.CharField("Nazwisko", max_length=100)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Nauczyciel"
        verbose_name_plural = "Nauczyciele"
        ordering = ["last_name", "first_name"]

    def __str__(self) -> str:
        title_prefix = f"{self.academic_title} " if self.academic_title else ""
        return f"{title_prefix}{self.first_name} {self.last_name}"


class Student(models.Model):
    class IdDocumentType(models.TextChoices):
        PASSPORT = "PASSPORT", "Paszport"
        ID_CARD = "ID_CARD", "Dowód osobisty"
        OTHER = "OTHER", "Inny dokument tożsamości"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school = models.ForeignKey(
        "core.School",
        on_delete=models.CASCADE,
        related_name="students",
        verbose_name="Szkoła",
    )
    cohort = models.ForeignKey(
        "core.Cohort",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="students",
        verbose_name="Klasa",
    )

    first_name = models.CharField("Imię", max_length=100)
    second_name = models.CharField(
        "Drugie imię", max_length=100, blank=True, default=""
    )
    last_name = models.CharField("Nazwisko", max_length=100)
    date_of_birth = models.DateField("Data urodzenia")
    place_of_birth = models.CharField("Miejsce urodzenia", max_length=100)
    pesel = models.CharField(
        "Numer PESEL",
        max_length=11,
        blank=True,
        null=True,
        validators=[validate_pesel],
    )
    id_document_type = models.CharField(
        "Rodzaj dokumentu tożsamości",
        max_length=20,
        choices=IdDocumentType.choices,
        blank=True,
        default="",
    )
    id_document_number = models.CharField(
        "Numer dokumentu tożsamości",
        max_length=50,
        blank=True,
        default="",
    )

    register_number = models.CharField(
        "Numer w księdze uczniów",
        max_length=50,
        help_text="Numer ewidencyjny w księdze uczniów danej szkoły",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Uczeń"
        verbose_name_plural = "Uczniowie"
        constraints = [
            models.UniqueConstraint(
                fields=["school", "register_number"],
                name="unique_student_register_number_per_school",
            ),
            models.UniqueConstraint(
                fields=["school", "pesel"],
                condition=models.Q(pesel__isnull=False),
                name="unique_student_pesel_per_school",
            ),
        ]

    def clean(self) -> None:
        super().clean()
        if not self.pesel:
            if not self.id_document_type or not self.id_document_number:
                raise ValidationError(
                    "W przypadku braku numeru PESEL należy podać rodzaj oraz numer dokumentu tożsamości."
                )

        if self.cohort and self.cohort.school_id != self.school_id:
            raise ValidationError(
                {"cohort": "Wybrana klasa musi należeć do tej samej szkoły co uczeń."}
            )

    def __str__(self) -> str:
        full_name = f"{self.first_name} {self.last_name}"
        if self.pesel:
            return f"{full_name} (PESEL: {self.pesel})"
        return f"{full_name} ({self.get_id_document_type_display()}: {self.id_document_number})"

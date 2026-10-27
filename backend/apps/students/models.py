import uuid
from datetime import timedelta
from typing import Any

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

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

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Uczęszcza (Aktywny)"
        GRADUATED = "GRADUATED", "Absolwent (Ukończył szkołę)"
        WITHDRAWN = "WITHDRAWN", "Odszedł / Skreślony"

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
        verbose_name="Obecna klasa",
    )

    status = models.CharField(
        "Status ucznia",
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
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

        if self.cohort and self.cohort.school != self.school:
            raise ValidationError(
                {"cohort": "Wybrana klasa musi należeć do tej samej szkoły co uczeń."}
            )

    def __str__(self) -> str:
        full_name = f"{self.first_name} {self.last_name}"
        if self.pesel:
            return f"{full_name} (PESEL: {self.pesel})"
        return f"{full_name} ({self.get_id_document_type_display()}: {self.id_document_number})"


class StudentHistoryEntry(models.Model):
    class EventType(models.TextChoices):
        ADMISSION = "ADMISSION", "Przyjęcie do szkoły"
        CLASS_ASSIGNMENT = "CLASS_ASSIGNMENT", "Przypisanie do klasy"
        PROMOTION = "PROMOTION", "Promocja do następnej klasy"
        REPEAT = "REPEAT", "Powtarzanie klasy"
        TRANSFER = "TRANSFER", "Przeniesienie do innej klasy"
        GRADUATION = "GRADUATION", "Ukończenie szkoły"
        WITHDRAWAL = "WITHDRAWAL", "Odejście ze szkoły"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="history_entries",
        verbose_name="Uczeń",
    )
    academic_year = models.ForeignKey(
        "core.AcademicYear",
        on_delete=models.CASCADE,
        related_name="student_history_entries",
        verbose_name="Rok szkolny",
    )
    event_type = models.CharField(
        "Typ zdarzenia",
        max_length=30,
        choices=EventType.choices,
    )
    event_date = models.DateField("Data zdarzenia")

    source_cohort = models.ForeignKey(
        "core.Cohort",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="history_source_entries",
        verbose_name="Klasa źródłowa",
    )
    target_cohort = models.ForeignKey(
        "core.Cohort",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="history_target_entries",
        verbose_name="Klasa docelowa",
    )

    document_number = models.CharField(
        "Numer uchwały / decyzji",
        max_length=100,
        blank=True,
        default="",
        help_text="np. numer uchwały Rady Pedagogicznej",
    )
    notes = models.TextField("Uwagi", blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Wpis w historii przebiegu nauki"
        verbose_name_plural = "Historia przebiegu nauki"
        ordering = ["-event_date", "-created_at"]

    def clean(self) -> None:
        super().clean()
        if self.source_cohort and self.source_cohort.school != self.student.school:
            raise ValidationError(
                {
                    "source_cohort": "Klasa źródłowa musi należeć do tej samej szkoły co uczeń."
                }
            )
        if self.target_cohort and self.target_cohort.school != self.student.school:
            raise ValidationError(
                {
                    "target_cohort": "Klasa docelowa musi należeć do tej samej szkoły co uczeń."
                }
            )

    def __str__(self) -> str:
        return f"{self.student} - {self.get_event_type_display()} ({self.event_date})"


class StudentDataCorrection(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="data_corrections",
        verbose_name="Uczeń",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Autor korekty",
    )
    reason = models.TextField(
        "Powód korekty",
        help_text="Wyjaśnienie przyczyny zmiany istotnych danych (np. sprostowanie błędu pisarskiego, zmiana nazwiska po orzeczeniu)",
    )
    changed_fields = models.JSONField(
        "Zmienione pola",
        default=dict,
        help_text="Słownik reprezentujący różnice w postaci: {'field_name': {'old': ..., 'new': ...}}",
    )
    created_at = models.DateTimeField("Czas korekty", auto_now_add=True)

    class Meta:
        verbose_name = "Korekta danych ucznia"
        verbose_name_plural = "Korekty danych uczniów"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        if self.author and hasattr(self.author, "get_full_name"):
            author_name = self.author.get_full_name() or self.author.get_username()
        elif self.author:
            author_name = str(self.author)
        else:
            author_name = "System / Nieznany"

        return f"Korekta {self.student} przez {author_name} ({self.created_at:%Y-%m-%d %H:%M})"


class ImportBatchQuerySet(models.QuerySet["ImportBatch"]):
    def for_school(self, school: Any) -> "ImportBatchQuerySet":
        return self.filter(school=school)

    def expired(self) -> "ImportBatchQuerySet":
        return self.filter(
            expires_at__lte=timezone.now(),
            file_purged=False,
        ).exclude(file="")


class ImportBatch(models.Model):
    DEFAULT_RETENTION_DAYS = 7

    class SourceType(models.TextChoices):
        CSV = "CSV", "Plik CSV"
        JSON = "JSON", "Plik JSON"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Oczekuje na przetworzenie"
        VALIDATING = "VALIDATING", "Weryfikacja w toku"
        VALIDATED = "VALIDATED", "Zweryfikowany pomyślnie"
        FAILED = "FAILED", "Błąd weryfikacji / przetwarzania"
        APPLYING = "APPLYING", "Import w toku"
        COMPLETED = "COMPLETED", "Zakończony pomyślnie"
        REJECTED = "REJECTED", "Odrzucony"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school = models.ForeignKey(
        "core.School",
        on_delete=models.CASCADE,
        related_name="import_batches",
        verbose_name="Szkoła",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="import_batches",
        verbose_name="Autor importu",
    )

    source_type = models.CharField(
        "Typ źródła",
        max_length=10,
        choices=SourceType.choices,
    )
    status = models.CharField(
        "Status partii",
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    file = models.FileField(
        "Plik źródłowy",
        upload_to="imports/%Y/%m/",
        null=True,
        blank=True,
    )
    original_filename = models.CharField("Oryginalna nazwa pliku", max_length=255)
    file_size_bytes = models.PositiveIntegerField("Rozmiar pliku (bajty)", default=0)
    checksum = models.CharField(
        "Suma kontrolna (SHA-256)",
        max_length=64,
        help_text="Suma kontrolna SHA-256 pliku źródłowego",
    )

    # Liczniki rekordów i błędów
    total_records = models.PositiveIntegerField("Łączna liczba rekordów", default=0)
    valid_records = models.PositiveIntegerField("Liczba poprawnych rekordów", default=0)
    invalid_records = models.PositiveIntegerField("Liczba błędnych rekordów", default=0)
    imported_records = models.PositiveIntegerField(
        "Liczba zaimportowanych rekordów", default=0
    )

    errors = models.JSONField(
        "Lista błędów walidacji",
        default=list,
        blank=True,
        help_text="Szczegóły błędów: wiersz, pole, kod, opis",
    )
    warnings = models.JSONField(
        "Lista ostrzeżeń walidacji",
        default=list,
        blank=True,
        help_text="Lista ostrzeżeń (np. nieznana klasa, brak drugiego imienia)",
    )

    # Czasy
    created_at = models.DateTimeField("Data utworzenia", auto_now_add=True)
    updated_at = models.DateTimeField("Data aktualizacji", auto_now=True)
    completed_at = models.DateTimeField("Data zakończenia", null=True, blank=True)

    # Retencja pliku źródłowego
    expires_at = models.DateTimeField(
        "Data wygaśnięcia pliku źródłowego",
        help_text="Termin, po którym plik źródłowy zostanie automatycznie usunięty z dysku",
    )
    file_purged = models.BooleanField(
        "Plik usunięty po retencji",
        default=False,
    )

    objects = ImportBatchQuerySet.as_manager()

    class Meta:
        verbose_name = "Partia importu"
        verbose_name_plural = "Partie importu"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["school", "-created_at"]),
            models.Index(fields=["status"]),
            models.Index(fields=["expires_at", "file_purged"]),
        ]

    def save(self, *args: Any, **kwargs: Any) -> None:
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(
                days=self.DEFAULT_RETENTION_DAYS
            )
        super().save(*args, **kwargs)

    @property
    def is_expired(self) -> bool:
        if not self.expires_at:
            return False
        return timezone.now() >= self.expires_at

    def purge_file(self) -> bool:
        """Trwale usuwa fizyczny plik źródłowy z magazynu po wygaśnięciu okresu retencji."""
        if self.file and not self.file_purged:
            storage = self.file.storage
            name = self.file.name
            if name and storage.exists(name):
                storage.delete(name)
            self.file = None
            self.file_purged = True
            self.save(update_fields=["file", "file_purged", "updated_at"])
            return True
        return False

    def __str__(self) -> str:
        return f"Partia {self.original_filename} ({self.get_source_type_display()}, {self.get_status_display()}) - {self.created_at:%Y-%m-%d %H:%M}"

from datetime import date
from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction

from apps.core.models import AcademicYear, Cohort
from apps.students.models import Student, StudentDataCorrection, StudentHistoryEntry


class StudentEnrollmentService:
    @staticmethod
    @transaction.atomic
    def register_admission(
        student: Student,
        academic_year: AcademicYear,
        event_date: date,
        cohort: Cohort | None = None,
        document_number: str = "",
        notes: str = "",
    ) -> StudentHistoryEntry:
        student.status = Student.Status.ACTIVE
        if cohort:
            student.cohort = cohort
        student.save(update_fields=["status", "cohort", "updated_at"])

        entry = StudentHistoryEntry.objects.create(
            student=student,
            academic_year=academic_year,
            event_type=StudentHistoryEntry.EventType.ADMISSION,
            event_date=event_date,
            target_cohort=cohort,
            document_number=document_number,
            notes=notes,
        )

        if cohort:
            StudentHistoryEntry.objects.create(
                student=student,
                academic_year=academic_year,
                event_type=StudentHistoryEntry.EventType.CLASS_ASSIGNMENT,
                event_date=event_date,
                target_cohort=cohort,
                document_number=document_number,
                notes="Automatyczne przypisanie do klasy przy przyjęciu.",
            )

        return entry

    @staticmethod
    @transaction.atomic
    def promote_student(
        student: Student,
        target_cohort: Cohort,
        academic_year: AcademicYear,
        event_date: date,
        document_number: str = "",
        notes: str = "",
    ) -> StudentHistoryEntry:
        source_cohort = student.cohort
        student.cohort = target_cohort
        student.status = Student.Status.ACTIVE
        student.save(update_fields=["cohort", "status", "updated_at"])

        return StudentHistoryEntry.objects.create(
            student=student,
            academic_year=academic_year,
            event_type=StudentHistoryEntry.EventType.PROMOTION,
            event_date=event_date,
            source_cohort=source_cohort,
            target_cohort=target_cohort,
            document_number=document_number,
            notes=notes,
        )

    @staticmethod
    @transaction.atomic
    def repeat_year(
        student: Student,
        target_cohort: Cohort,
        academic_year: AcademicYear,
        event_date: date,
        document_number: str = "",
        notes: str = "",
    ) -> StudentHistoryEntry:
        source_cohort = student.cohort
        student.cohort = target_cohort
        student.status = Student.Status.ACTIVE
        student.save(update_fields=["cohort", "status", "updated_at"])

        return StudentHistoryEntry.objects.create(
            student=student,
            academic_year=academic_year,
            event_type=StudentHistoryEntry.EventType.REPEAT,
            event_date=event_date,
            source_cohort=source_cohort,
            target_cohort=target_cohort,
            document_number=document_number,
            notes=notes,
        )

    @staticmethod
    @transaction.atomic
    def transfer_cohort(
        student: Student,
        target_cohort: Cohort,
        academic_year: AcademicYear,
        event_date: date,
        document_number: str = "",
        notes: str = "",
    ) -> StudentHistoryEntry:
        source_cohort = student.cohort
        student.cohort = target_cohort
        student.save(update_fields=["cohort", "updated_at"])

        return StudentHistoryEntry.objects.create(
            student=student,
            academic_year=academic_year,
            event_type=StudentHistoryEntry.EventType.TRANSFER,
            event_date=event_date,
            source_cohort=source_cohort,
            target_cohort=target_cohort,
            document_number=document_number,
            notes=notes,
        )

    @staticmethod
    @transaction.atomic
    def graduate_student(
        student: Student,
        academic_year: AcademicYear,
        event_date: date,
        document_number: str = "",
        notes: str = "",
    ) -> StudentHistoryEntry:
        source_cohort = student.cohort
        student.cohort = None
        student.status = Student.Status.GRADUATED
        student.save(update_fields=["cohort", "status", "updated_at"])

        return StudentHistoryEntry.objects.create(
            student=student,
            academic_year=academic_year,
            event_type=StudentHistoryEntry.EventType.GRADUATION,
            event_date=event_date,
            source_cohort=source_cohort,
            document_number=document_number,
            notes=notes,
        )

    @staticmethod
    @transaction.atomic
    def withdraw_student(
        student: Student,
        academic_year: AcademicYear,
        event_date: date,
        document_number: str = "",
        notes: str = "",
    ) -> StudentHistoryEntry:
        source_cohort = student.cohort
        student.cohort = None
        student.status = Student.Status.WITHDRAWN
        student.save(update_fields=["cohort", "status", "updated_at"])

        return StudentHistoryEntry.objects.create(
            student=student,
            academic_year=academic_year,
            event_type=StudentHistoryEntry.EventType.WITHDRAWAL,
            event_date=event_date,
            source_cohort=source_cohort,
            document_number=document_number,
            notes=notes,
        )


class StudentCorrectionService:
    TRACKED_FIELDS: set[str] = {
        "first_name",
        "second_name",
        "last_name",
        "date_of_birth",
        "place_of_birth",
        "pesel",
        "id_document_type",
        "id_document_number",
        "register_number",
    }

    @classmethod
    @transaction.atomic
    def update_student_with_history(
        cls,
        student: Student,
        updated_data: dict[str, Any],
        author: Any,
        reason: str,
    ) -> tuple[Student, StudentDataCorrection | None]:
        if not reason or not reason.strip():
            raise ValidationError(
                {"reason": "Wymagane jest podanie powodu korekty istotnych danych."}
            )
        db_student = (
            Student.objects.filter(pk=student.pk).first() if student.pk else None
        )

        changes: dict[str, dict[str, Any]] = {}

        for field, new_value in updated_data.items():
            if hasattr(student, field):
                if field in cls.TRACKED_FIELDS and db_student is not None:
                    old_value = getattr(db_student, field)

                    old_val_ser = (
                        old_value.isoformat()
                        if isinstance(old_value, date)
                        else old_value
                    )
                    new_val_ser = (
                        new_value.isoformat()
                        if isinstance(new_value, date)
                        else new_value
                    )

                    if old_val_ser != new_val_ser:
                        changes[field] = {"old": old_val_ser, "new": new_val_ser}

                setattr(student, field, new_value)

        student.full_clean()
        student.save()

        correction_entry: StudentDataCorrection | None = None
        if changes:
            correction_entry = StudentDataCorrection.objects.create(
                student=student,
                author=author if getattr(author, "is_authenticated", False) else None,
                reason=reason.strip(),
                changed_fields=changes,
            )

        return student, correction_entry

from datetime import date

from django.db import transaction

from apps.core.models import AcademicYear, Cohort
from apps.students.models import Student, StudentHistoryEntry


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

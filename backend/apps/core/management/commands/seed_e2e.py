"""Deterministic, fictional data for the Playwright E2E tests (frontend/e2e).

    python manage.py seed_e2e

Creates two schools, one account per role in school A and a student in school B
(for cross-school tests). Safe to run repeatedly. Ids, e-mails and the password are
shared with frontend/e2e/fixtures.ts – change them together.
"""

import os
import uuid
from datetime import date
from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.core.models import AcademicYear, Cohort, School
from apps.students.models import Student
from apps.users.models import SchoolMembership, User

Role = SchoolMembership.Role

SCHOOL_A_ID = uuid.UUID("e2e00000-0000-4000-8000-00000000000a")
SCHOOL_B_ID = uuid.UUID("e2e00000-0000-4000-8000-00000000000b")
FOREIGN_STUDENT_ID = uuid.UUID("e2e00000-0000-4000-8000-0000000000b1")

USERS: dict[str, tuple[Role, str, str]] = {
    "e2e-sekretariat@szkola-a.test": (Role.SECRETARIAT, "Sylwia", "Sekretarska"),
    "e2e-nauczyciel@szkola-a.test": (Role.TEACHER, "Norbert", "Nauczycielski"),
    "e2e-wychowawca@szkola-a.test": (Role.HOMEROOM_TEACHER, "Wanda", "Wychowawczyni"),
    "e2e-dyrekcja@szkola-a.test": (Role.PRINCIPAL, "Damian", "Dyrektorski"),
    "e2e-admin@szkola-a.test": (Role.ADMIN, "Adam", "Administracyjny"),
}

STUDENTS_A = [
    ("1/2025", "Jan", "Testowy"),
    ("2/2025", "Ewa", "Przykładowa"),
    ("3/2025", "Piotr", "Fikcyjny"),
]


def ensure_school(
    school_id: uuid.UUID, name: str
) -> tuple[School, AcademicYear, Cohort]:
    school, _ = School.objects.update_or_create(
        id=school_id, defaults={"name": name, "city": "Testowo"}
    )
    year, _ = AcademicYear.objects.update_or_create(
        school=school,
        name="2025/2026",
        defaults={
            "start_date": date(2025, 9, 1),
            "end_date": date(2026, 6, 26),
            "is_current": True,
        },
    )
    cohort, _ = Cohort.objects.update_or_create(
        school=school, academic_year=year, name="1A", defaults={"level": 1}
    )
    return school, year, cohort


def ensure_student(
    school: School, cohort: Cohort, register_number: str, **fields: Any
) -> Student:
    student, _ = Student.objects.update_or_create(
        school=school,
        register_number=register_number,
        defaults={
            "cohort": cohort,
            "date_of_birth": date(2010, 1, 1),
            "place_of_birth": "Testowo",
            "id_document_type": Student.IdDocumentType.PASSPORT,
            "id_document_number": f"E2E-{register_number}",
            **fields,
        },
    )
    return student


class Command(BaseCommand):
    help = "Tworzy fikcyjne dane dla testów E2E (tylko środowisko deweloperskie/CI)."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument(
            "--force",
            action="store_true",
            help="Uruchom mimo DEBUG=False (np. w odizolowanym środowisku testowym).",
        )

    @transaction.atomic
    def handle(self, *args: Any, **options: Any) -> None:
        if not settings.DEBUG and not options["force"]:
            raise CommandError(
                "seed_e2e tworzy konta ze znanym hasłem – dozwolone tylko przy DEBUG=True "
                "(albo z --force w środowisku testowym)."
            )
        password = os.getenv("E2E_PASSWORD", "e2e-Haslo-Testowe-1")

        school_a, _, cohort_a = ensure_school(SCHOOL_A_ID, "E2E Szkoła A")
        school_b, _, cohort_b = ensure_school(SCHOOL_B_ID, "E2E Szkoła B")

        for register_number, first_name, last_name in STUDENTS_A:
            ensure_student(
                school_a,
                cohort_a,
                register_number=register_number,
                first_name=first_name,
                last_name=last_name,
            )
        # Stable id, so the E2E test can open this student's URL directly.
        Student.objects.filter(school=school_b).exclude(pk=FOREIGN_STUDENT_ID).delete()
        Student.objects.update_or_create(
            id=FOREIGN_STUDENT_ID,
            defaults={
                "school": school_b,
                "cohort": cohort_b,
                "register_number": "1/2025",
                "first_name": "Obcy",
                "last_name": "Uczeń",
                "date_of_birth": date(2010, 1, 1),
                "place_of_birth": "Testowo",
                "id_document_type": Student.IdDocumentType.PASSPORT,
                "id_document_number": "E2E-B-1",
            },
        )

        for email, (role, first_name, last_name) in USERS.items():
            user, _ = User.objects.update_or_create(
                email=email,
                defaults={
                    "first_name": first_name,
                    "last_name": last_name,
                    "is_active": True,
                },
            )
            user.set_password(password)
            user.save(update_fields=["password"])
            SchoolMembership.objects.update_or_create(
                user=user, school=school_a, defaults={"role": role, "is_active": True}
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Dane E2E gotowe: {len(USERS)} kont w {school_a.name}, "
                f"uczeń {FOREIGN_STUDENT_ID} w {school_b.name}."
            )
        )

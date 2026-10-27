from datetime import timedelta

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone

from apps.core.models import School
from apps.students.models import ImportBatch
from apps.students.services import (
    ImportBatchRetentionService,
    calculate_file_checksum,
)
from apps.users.models import User


@pytest.fixture
def school() -> School:
    return School.objects.create(name="Technikum Testowe", city="Warszawa")


@pytest.fixture
def author() -> User:
    return User.objects.create_user(
        email="sekretarz@szkola.pl",
        password="bezpieczne-haslo-123",
        first_name="Tomasz",
        last_name="Kot",
    )


@pytest.mark.django_db
class TestImportBatchModel:
    def test_create_import_batch_with_defaults(
        self, school: School, author: User
    ) -> None:
        batch = ImportBatch.objects.create(
            school=school,
            author=author,
            source_type=ImportBatch.SourceType.CSV,
            original_filename="uczniowie_2025.csv",
            file_size_bytes=1024,
            checksum="a" * 64,
        )

        assert batch.id is not None
        assert batch.school == school
        assert batch.author == author
        assert batch.source_type == ImportBatch.SourceType.CSV
        assert batch.status == ImportBatch.Status.PENDING
        assert batch.total_records == 0
        assert batch.valid_records == 0
        assert batch.invalid_records == 0
        assert batch.imported_records == 0
        assert batch.errors == []
        assert batch.warnings == []
        assert batch.file_purged is False
        assert batch.expires_at is not None
        # Default retention is 7 days
        expected_expiry = timezone.now() + timedelta(days=7)
        assert abs((batch.expires_at - expected_expiry).total_seconds()) < 60
        assert batch.is_expired is False

    def test_calculate_file_checksum(self) -> None:
        content = b"register_number,first_name\nU/01,Jan"
        checksum = calculate_file_checksum(content)
        assert len(checksum) == 64
        # Deterministic SHA-256
        assert checksum == calculate_file_checksum(content)

    def test_import_batch_purge_file(self, school: School, author: User) -> None:
        uploaded_file = SimpleUploadedFile(
            "test_import.csv",
            b"id,name\n1,Jan",
            content_type="text/csv",
        )

        batch = ImportBatch.objects.create(
            school=school,
            author=author,
            source_type=ImportBatch.SourceType.CSV,
            file=uploaded_file,
            original_filename="test_import.csv",
            file_size_bytes=len(b"id,name\n1,Jan"),
            checksum="b" * 64,
        )

        assert bool(batch.file) is True
        assert batch.file_purged is False

        storage = batch.file.storage
        file_path = batch.file.name
        assert file_path is not None
        assert storage.exists(file_path) is True

        # Purge file
        result = batch.purge_file()
        assert result is True

        batch.refresh_from_db()
        assert bool(batch.file) is False
        assert batch.file_purged is True
        assert storage.exists(file_path) is False

        # Calling purge_file again returns False and does nothing
        assert batch.purge_file() is False

    def test_is_expired_property(self, school: School, author: User) -> None:
        past_time = timezone.now() - timedelta(days=1)
        batch = ImportBatch.objects.create(
            school=school,
            author=author,
            source_type=ImportBatch.SourceType.JSON,
            original_filename="dane.json",
            checksum="c" * 64,
            expires_at=past_time,
        )
        assert batch.is_expired is True

    def test_queryset_for_school_and_expired(
        self, school: School, author: User
    ) -> None:
        other_school = School.objects.create(name="Inna Szkoła", city="Kraków")

        now = timezone.now()
        # Batch 1: Expired with file
        batch_expired = ImportBatch.objects.create(
            school=school,
            author=author,
            source_type=ImportBatch.SourceType.CSV,
            file=SimpleUploadedFile("exp.csv", b"test"),
            original_filename="exp.csv",
            checksum="d" * 64,
            expires_at=now - timedelta(days=2),
        )

        # Batch 2: Not expired
        ImportBatch.objects.create(
            school=school,
            author=author,
            source_type=ImportBatch.SourceType.CSV,
            file=SimpleUploadedFile("active.csv", b"test"),
            original_filename="active.csv",
            checksum="e" * 64,
            expires_at=now + timedelta(days=5),
        )

        # Batch 3: Expired for other school
        ImportBatch.objects.create(
            school=other_school,
            author=author,
            source_type=ImportBatch.SourceType.CSV,
            file=SimpleUploadedFile("other_exp.csv", b"test"),
            original_filename="other_exp.csv",
            checksum="f" * 64,
            expires_at=now - timedelta(days=1),
        )

        assert ImportBatch.objects.for_school(school).count() == 2
        assert ImportBatch.objects.for_school(other_school).count() == 1

        expired_all = list(ImportBatch.objects.expired())
        assert len(expired_all) == 2
        assert batch_expired in expired_all

    def test_retention_service_purges_only_expired_files(
        self, school: School, author: User
    ) -> None:
        now = timezone.now()

        # Batch 1: expired
        batch1 = ImportBatch.objects.create(
            school=school,
            author=author,
            source_type=ImportBatch.SourceType.CSV,
            file=SimpleUploadedFile("b1.csv", b"test1"),
            original_filename="b1.csv",
            checksum="1" * 64,
            expires_at=now - timedelta(days=1),
        )

        # Batch 2: active
        batch2 = ImportBatch.objects.create(
            school=school,
            author=author,
            source_type=ImportBatch.SourceType.CSV,
            file=SimpleUploadedFile("b2.csv", b"test2"),
            original_filename="b2.csv",
            checksum="2" * 64,
            expires_at=now + timedelta(days=3),
        )

        purged_count = ImportBatchRetentionService.purge_expired_batches()
        assert purged_count == 1

        batch1.refresh_from_db()
        batch2.refresh_from_db()

        assert batch1.file_purged is True
        assert bool(batch1.file) is False

        assert batch2.file_purged is False
        assert bool(batch2.file) is True

from datetime import date

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.core.models import AcademicYear, Cohort, School
from apps.students.models import Student, StudentDataCorrection, StudentHistoryEntry
from apps.users.models import SchoolMembership, User

PASSWORD = "bezpieczne-haslo-123"


@pytest.fixture
def school() -> School:
    return School.objects.create(name="Technikum nr 1", city="Warszawa")


@pytest.fixture
def other_school() -> School:
    return School.objects.create(name="Technikum nr 2", city="Kraków")


@pytest.fixture
def member(school: School) -> User:
    user = User.objects.create_user(
        email="sekretariat@szkola1.pl",
        password=PASSWORD,
        first_name="Anna",
        last_name="Nowak",
    )
    SchoolMembership.objects.create(
        user=user,
        school=school,
        role=SchoolMembership.Role.SECRETARIAT,
        is_active=True,
    )
    return user


@pytest.fixture
def academic_year(school: School) -> AcademicYear:
    return AcademicYear.objects.create(
        school=school,
        name="2025/2026",
        start_date=date(2025, 9, 1),
        end_date=date(2026, 6, 26),
        is_current=True,
    )


@pytest.fixture
def cohort(school: School, academic_year: AcademicYear) -> Cohort:
    return Cohort.objects.create(
        school=school,
        academic_year=academic_year,
        name="4A",
        level=4,
    )


@pytest.fixture
def cohort_b(school: School, academic_year: AcademicYear) -> Cohort:
    return Cohort.objects.create(
        school=school,
        academic_year=academic_year,
        name="3B",
        level=3,
    )


@pytest.fixture
def client(member: User, school: School) -> APIClient:
    api = APIClient()
    api.force_login(member)
    api.credentials(HTTP_X_SCHOOL_ID=str(school.id))
    return api


@pytest.fixture
def student(school: School, cohort: Cohort) -> Student:
    return Student.objects.create(
        school=school,
        cohort=cohort,
        first_name="Jan",
        second_name="Michał",
        last_name="Kowalski",
        date_of_birth=date(2007, 3, 15),
        place_of_birth="Warszawa",
        pesel="07231501234",
        id_document_type="",
        id_document_number="",
        register_number="U/001/2025",
        status=Student.Status.ACTIVE,
    )


@pytest.mark.django_db
class TestStudentsApiAuthenticationAndPermissions:
    def test_unauthenticated_request_is_rejected(self) -> None:
        client = APIClient()
        response = client.get("/api/students/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.json()["code"] == "not_authenticated"

    def test_missing_school_header_is_forbidden(self, member: User) -> None:
        client = APIClient()
        client.force_login(member)
        response = client.get("/api/students/")
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.json()["code"] == "permission_denied"

    def test_foreign_school_header_is_forbidden(
        self, member: User, other_school: School
    ) -> None:
        client = APIClient()
        client.force_login(member)
        response = client.get("/api/students/", HTTP_X_SCHOOL_ID=str(other_school.id))
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.json()["code"] == "permission_denied"


@pytest.mark.django_db
class TestStudentsApiListingAndFiltering:
    def test_list_students_pagination_format(
        self, client: APIClient, student: Student
    ) -> None:
        response = client.get("/api/students/")
        assert response.status_code == status.HTTP_200_OK

        body = response.json()
        assert "count" in body
        assert "page" in body
        assert "page_size" in body
        assert "total_pages" in body
        assert "results" in body
        assert body["count"] == 1
        assert len(body["results"]) == 1

        result = body["results"][0]
        assert result["id"] == str(student.id)
        assert result["first_name"] == "Jan"
        assert result["second_name"] == "Michał"
        assert result["last_name"] == "Kowalski"
        assert result["pesel"] == "07231501234"
        assert result["register_number"] == "U/001/2025"
        assert result["status"] == "ACTIVE"
        assert result["status_display"] == "Uczęszcza (Aktywny)"
        assert student.cohort is not None
        assert result["cohort"]["id"] == str(student.cohort.id)
        assert result["cohort"]["name"] == "4A"
        assert result["cohort"]["academic_year_name"] == "2025/2026"

    def test_students_from_other_schools_are_isolated(
        self,
        client: APIClient,
        student: Student,
        other_school: School,
    ) -> None:
        Student.objects.create(
            school=other_school,
            first_name="Piotr",
            last_name="Nowak",
            date_of_birth=date(2007, 5, 20),
            place_of_birth="Kraków",
            pesel="07252009876",
            register_number="KR/999",
            status=Student.Status.ACTIVE,
        )

        response = client.get("/api/students/")
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["count"] == 1
        assert body["results"][0]["id"] == str(student.id)

    def test_search_by_first_name(
        self, client: APIClient, school: School, student: Student
    ) -> None:
        Student.objects.create(
            school=school,
            first_name="Adam",
            last_name="Zieliński",
            date_of_birth=date(2007, 1, 10),
            place_of_birth="Warszawa",
            pesel="07211005555",
            register_number="U/002/2025",
        )

        response = client.get("/api/students/", {"search": "jan"})
        assert response.status_code == status.HTTP_200_OK
        results = response.json()["results"]
        assert len(results) == 1
        assert results[0]["id"] == str(student.id)

    def test_search_by_last_name(
        self, client: APIClient, school: School, student: Student
    ) -> None:
        Student.objects.create(
            school=school,
            first_name="Adam",
            last_name="Zieliński",
            date_of_birth=date(2007, 1, 10),
            place_of_birth="Warszawa",
            pesel="07211005555",
            register_number="U/002/2025",
        )

        response = client.get("/api/students/", {"search": "zieliń"})
        assert response.status_code == status.HTTP_200_OK
        results = response.json()["results"]
        assert len(results) == 1
        assert results[0]["last_name"] == "Zieliński"

    def test_search_by_pesel(
        self, client: APIClient, school: School, student: Student
    ) -> None:
        response = client.get("/api/students/", {"search": "072315"})
        assert response.status_code == status.HTTP_200_OK
        results = response.json()["results"]
        assert len(results) == 1
        assert results[0]["id"] == str(student.id)

    def test_search_by_register_number(
        self, client: APIClient, school: School, student: Student
    ) -> None:
        response = client.get("/api/students/", {"search": "U/001"})
        assert response.status_code == status.HTTP_200_OK
        results = response.json()["results"]
        assert len(results) == 1
        assert results[0]["id"] == str(student.id)

    def test_filter_by_status(
        self, client: APIClient, school: School, student: Student
    ) -> None:
        graduated = Student.objects.create(
            school=school,
            first_name="Absolwent",
            last_name="Stary",
            date_of_birth=date(2005, 4, 12),
            place_of_birth="Warszawa",
            pesel="05241203333",
            register_number="U/090/2020",
            status=Student.Status.GRADUATED,
        )

        response_active = client.get("/api/students/", {"status": "ACTIVE"})
        assert response_active.status_code == status.HTTP_200_OK
        assert response_active.json()["count"] == 1
        assert response_active.json()["results"][0]["id"] == str(student.id)

        response_graduated = client.get("/api/students/", {"status": "GRADUATED"})
        assert response_graduated.status_code == status.HTTP_200_OK
        assert response_graduated.json()["count"] == 1
        assert response_graduated.json()["results"][0]["id"] == str(graduated.id)

    def test_filter_by_cohort(
        self,
        client: APIClient,
        school: School,
        cohort: Cohort,
        cohort_b: Cohort,
        student: Student,
    ) -> None:
        other_student = Student.objects.create(
            school=school,
            cohort=cohort_b,
            first_name="Marek",
            last_name="Borkowski",
            date_of_birth=date(2008, 6, 18),
            place_of_birth="Warszawa",
            pesel="08261804444",
            register_number="U/003/2025",
            status=Student.Status.ACTIVE,
        )

        response = client.get("/api/students/", {"cohort": str(cohort_b.id)})
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["count"] == 1
        assert response.json()["results"][0]["id"] == str(other_student.id)

    def test_filter_by_academic_year(
        self,
        client: APIClient,
        school: School,
        academic_year: AcademicYear,
        student: Student,
    ) -> None:
        other_year = AcademicYear.objects.create(
            school=school,
            name="2024/2025",
            start_date=date(2024, 9, 1),
            end_date=date(2025, 6, 27),
            is_current=False,
        )
        old_cohort = Cohort.objects.create(
            school=school,
            academic_year=other_year,
            name="1A",
            level=1,
        )
        Student.objects.create(
            school=school,
            cohort=old_cohort,
            first_name="Dawny",
            last_name="Uczeń",
            date_of_birth=date(2008, 1, 1),
            place_of_birth="Warszawa",
            pesel="08210107777",
            register_number="U/004/2024",
            status=Student.Status.ACTIVE,
        )

        response = client.get(
            "/api/students/", {"academic_year": str(academic_year.id)}
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["count"] == 1
        assert response.json()["results"][0]["id"] == str(student.id)

    def test_ordering(
        self, client: APIClient, school: School, student: Student
    ) -> None:
        Student.objects.create(
            school=school,
            first_name="Zenon",
            last_name="Adamski",
            date_of_birth=date(2007, 2, 2),
            place_of_birth="Warszawa",
            pesel="07220208888",
            register_number="U/005/2025",
            status=Student.Status.ACTIVE,
        )

        resp_asc = client.get("/api/students/", {"ordering": "last_name"})
        results_asc = resp_asc.json()["results"]
        assert results_asc[0]["last_name"] == "Adamski"
        assert results_asc[1]["last_name"] == "Kowalski"

        resp_desc = client.get("/api/students/", {"ordering": "-last_name"})
        results_desc = resp_desc.json()["results"]
        assert results_desc[0]["last_name"] == "Kowalski"
        assert results_desc[1]["last_name"] == "Adamski"


@pytest.mark.django_db
class TestStudentsApiDetail:
    def test_retrieve_student_detail_includes_history_and_corrections(
        self,
        client: APIClient,
        school: School,
        academic_year: AcademicYear,
        cohort: Cohort,
        cohort_b: Cohort,
        student: Student,
        member: User,
    ) -> None:
        history_entry = StudentHistoryEntry.objects.create(
            student=student,
            academic_year=academic_year,
            event_type=StudentHistoryEntry.EventType.TRANSFER,
            event_date=date(2025, 10, 1),
            source_cohort=cohort,
            target_cohort=cohort_b,
            document_number="UCH/12/2025",
            notes="Przeniesienie na prośbę rodziców",
        )
        correction = StudentDataCorrection.objects.create(
            student=student,
            author=member,
            reason="Poprawa literówki w nazwisku",
            changed_fields={"last_name": {"old": "Kowalsky", "new": "Kowalski"}},
        )

        response = client.get(f"/api/students/{student.id}/")
        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert data["id"] == str(student.id)
        assert data["place_of_birth"] == "Warszawa"
        assert len(data["history_entries"]) == 1
        assert data["history_entries"][0]["id"] == str(history_entry.id)
        assert data["history_entries"][0]["event_type"] == "TRANSFER"
        assert (
            data["history_entries"][0]["event_type_display"]
            == "Przeniesienie do innej klasy"
        )
        assert data["history_entries"][0]["academic_year_name"] == "2025/2026"
        assert data["history_entries"][0]["source_cohort_name"] == "4A"
        assert data["history_entries"][0]["target_cohort_name"] == "3B"
        assert data["history_entries"][0]["document_number"] == "UCH/12/2025"

        assert len(data["data_corrections"]) == 1
        assert data["data_corrections"][0]["id"] == str(correction.id)
        assert data["data_corrections"][0]["author_email"] == member.email
        assert data["data_corrections"][0]["reason"] == "Poprawa literówki w nazwisku"
        assert "last_name" in data["data_corrections"][0]["changed_fields"]

    def test_retrieve_foreign_school_student_returns_404(
        self, client: APIClient, other_school: School
    ) -> None:
        foreign_student = Student.objects.create(
            school=other_school,
            first_name="Kamil",
            last_name="Nowak",
            date_of_birth=date(2007, 7, 7),
            place_of_birth="Kraków",
            pesel="07270701111",
            register_number="KR/100",
            status=Student.Status.ACTIVE,
        )

        response = client.get(f"/api/students/{foreign_student.id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json()["code"] == "not_found"

    def test_retrieve_non_existent_student_returns_404(self, client: APIClient) -> None:
        import uuid

        random_id = uuid.uuid4()
        response = client.get(f"/api/students/{random_id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json()["code"] == "not_found"

    def test_mutating_methods_are_not_allowed(
        self, client: APIClient, student: Student
    ) -> None:
        assert (
            client.post("/api/students/", {}).status_code
            == status.HTTP_405_METHOD_NOT_ALLOWED
        )
        assert (
            client.put(f"/api/students/{student.id}/", {}).status_code
            == status.HTTP_405_METHOD_NOT_ALLOWED
        )
        assert (
            client.delete(f"/api/students/{student.id}/").status_code
            == status.HTTP_405_METHOD_NOT_ALLOWED
        )

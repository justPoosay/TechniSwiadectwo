import django_filters

from apps.students.models import Student


class StudentFilter(django_filters.FilterSet):
    status = django_filters.ChoiceFilter(
        choices=Student.Status.choices,
        label="Status ucznia",
    )
    cohort = django_filters.UUIDFilter(
        field_name="cohort_id",
        label="Klasa (UUID)",
    )
    academic_year = django_filters.UUIDFilter(
        field_name="cohort__academic_year_id",
        label="Rok szkolny klasy (UUID)",
    )

    class Meta:
        model = Student
        fields = ["status", "cohort", "academic_year"]

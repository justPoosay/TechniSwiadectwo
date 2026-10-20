from rest_framework import serializers

from apps.core.models import Cohort
from apps.students.models import Student, StudentDataCorrection, StudentHistoryEntry


class CohortNestedSerializer(serializers.ModelSerializer):
    academic_year_name = serializers.CharField(
        source="academic_year.name", read_only=True
    )

    class Meta:
        model = Cohort
        fields = ["id", "name", "level", "academic_year_name"]


class StudentHistoryEntrySerializer(serializers.ModelSerializer):
    event_type_display = serializers.CharField(
        source="get_event_type_display", read_only=True
    )
    academic_year_name = serializers.CharField(
        source="academic_year.name", read_only=True
    )
    source_cohort_name = serializers.CharField(
        source="source_cohort.name", read_only=True, allow_null=True
    )
    target_cohort_name = serializers.CharField(
        source="target_cohort.name", read_only=True, allow_null=True
    )

    class Meta:
        model = StudentHistoryEntry
        fields = [
            "id",
            "event_type",
            "event_type_display",
            "event_date",
            "academic_year_name",
            "source_cohort_name",
            "target_cohort_name",
            "document_number",
            "notes",
            "created_at",
        ]


class StudentDataCorrectionSerializer(serializers.ModelSerializer):
    author_email = serializers.EmailField(
        source="author.email", read_only=True, allow_null=True
    )

    class Meta:
        model = StudentDataCorrection
        fields = [
            "id",
            "author_email",
            "reason",
            "changed_fields",
            "created_at",
        ]


class StudentListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    cohort = CohortNestedSerializer(read_only=True, allow_null=True)

    class Meta:
        model = Student
        fields = [
            "id",
            "first_name",
            "second_name",
            "last_name",
            "pesel",
            "id_document_type",
            "id_document_number",
            "register_number",
            "status",
            "status_display",
            "cohort",
            "date_of_birth",
            "created_at",
            "updated_at",
        ]


class StudentDetailSerializer(StudentListSerializer):
    history_entries = StudentHistoryEntrySerializer(many=True, read_only=True)
    data_corrections = StudentDataCorrectionSerializer(many=True, read_only=True)

    class Meta(StudentListSerializer.Meta):
        fields = StudentListSerializer.Meta.fields + [
            "place_of_birth",
            "history_entries",
            "data_corrections",
        ]

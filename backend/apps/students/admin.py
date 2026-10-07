from django.contrib import admin

from apps.students.models import Student, StudentHistoryEntry, Teacher


class StudentHistoryEntryInline(admin.TabularInline):
    model = StudentHistoryEntry
    extra = 0
    readonly_fields = ("created_at",)
    fields = (
        "event_date",
        "academic_year",
        "event_type",
        "source_cohort",
        "target_cohort",
        "document_number",
        "notes",
    )
    ordering = ("-event_date", "-created_at")


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = (
        "first_name",
        "last_name",
        "academic_title",
        "school",
        "user",
    )
    list_filter = ("school",)
    search_fields = (
        "first_name",
        "last_name",
        "academic_title",
    )
    ordering = ("school", "last_name", "first_name")
    raw_id_fields = ("user",)


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = (
        "register_number",
        "first_name",
        "last_name",
        "status",
        "cohort",
        "school",
        "pesel",
        "date_of_birth",
    )
    list_filter = (
        "school",
        "status",
        "cohort__academic_year",
        "cohort",
        "id_document_type",
    )
    search_fields = (
        "first_name",
        "last_name",
        "pesel",
        "register_number",
        "id_document_number",
        "cohort__name",
    )
    ordering = ("school", "cohort", "register_number", "last_name", "first_name")
    autocomplete_fields = ["cohort"]
    inlines = [StudentHistoryEntryInline]


@admin.register(StudentHistoryEntry)
class StudentHistoryEntryAdmin(admin.ModelAdmin):
    list_display = (
        "student",
        "event_type",
        "event_date",
        "academic_year",
        "source_cohort",
        "target_cohort",
        "document_number",
    )
    list_filter = (
        "student__school",
        "event_type",
        "academic_year",
    )
    search_fields = (
        "student__first_name",
        "student__last_name",
        "student__pesel",
        "document_number",
        "notes",
    )
    ordering = ("-event_date", "-created_at")
    autocomplete_fields = ["student", "source_cohort", "target_cohort"]

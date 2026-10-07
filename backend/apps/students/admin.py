from django.contrib import admin

from apps.students.models import Student, Teacher


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
        "cohort",
        "school",
        "pesel",
        "date_of_birth",
    )
    list_filter = (
        "school",
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

from django.contrib import admin

from apps.students.models import Student

from .models import AcademicYear, Cohort, School


@admin.register(School)
class SchoolAdmin(admin.ModelAdmin):
    list_display = ("name", "city", "rspo")


@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ("name", "school", "is_current", "start_date", "end_date")
    list_filter = ("school", "is_current")


class StudentInlineForCohort(admin.TabularInline):
    model = Student
    extra = 0
    fields = (
        "register_number",
        "first_name",
        "second_name",
        "last_name",
        "pesel",
        "date_of_birth",
    )
    ordering = ("register_number", "last_name", "first_name")
    show_change_link = True


@admin.register(Cohort)
class CohortAdmin(admin.ModelAdmin):
    list_display = ("name", "school", "academic_year", "level", "class_teacher")
    list_filter = ("school", "academic_year", "level")
    search_fields = ("name", "class_teacher__first_name", "class_teacher__last_name")
    autocomplete_fields = ["class_teacher"]
    inlines = [StudentInlineForCohort]

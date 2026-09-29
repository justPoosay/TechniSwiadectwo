from django.contrib import admin

from .models import AcademicYear, Cohort, School


@admin.register(School)
class SchoolAdmin(admin.ModelAdmin):
    list_display = ("name", "city", "rspo")


@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ("name", "school", "is_current", "start_date", "end_date")
    list_filter = ("school", "is_current")


@admin.register(Cohort)
class CohortAdmin(admin.ModelAdmin):
    list_display = ("name", "school", "academic_year", "level")
    list_filter = ("school", "academic_year")

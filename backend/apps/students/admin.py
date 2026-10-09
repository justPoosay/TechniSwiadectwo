from typing import Any

from django import forms
from django.contrib import admin

from apps.students.models import (
    Student,
    StudentDataCorrection,
    StudentHistoryEntry,
    Teacher,
)
from apps.students.services import StudentCorrectionService


class StudentAdminForm(forms.ModelForm):
    correction_reason = forms.CharField(
        label="Powód korekty danych",
        widget=forms.Textarea(attrs={"rows": 2}),
        required=False,
        help_text="Wymagane przy zmianie danych tożsamościowych (imię, nazwisko, PESEL itp.) edytowanego ucznia.",
    )

    class Meta:
        model = Student
        fields = "__all__"

    def clean(self) -> dict[str, Any]:
        cleaned_data = super().clean() or {}

        # Jeśli to edycja istniejącego ucznia
        if self.instance and self.instance.pk:
            reason = cleaned_data.get("correction_reason")

            # Sprawdzamy, czy zmieniono któreś z monitorowanych pól
            has_tracked_changes = any(
                field in cleaned_data
                and cleaned_data[field] != getattr(self.instance, field)
                for field in StudentCorrectionService.TRACKED_FIELDS
            )

            if has_tracked_changes and not (reason and reason.strip()):
                self.add_error(
                    "correction_reason",
                    "Wymagane jest podanie powodu korekty przy zmianie danych tożsamościowych ucznia.",
                )

        return cleaned_data


class StudentDataCorrectionInline(admin.TabularInline):
    model = StudentDataCorrection
    extra = 0
    can_delete = False
    readonly_fields = ("author", "reason", "changed_fields", "created_at")
    fields = ("created_at", "author", "reason", "changed_fields")
    ordering = ("-created_at",)

    def has_add_permission(self, request: Any, obj: Any = None) -> bool:
        return False


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
    form = StudentAdminForm
    list_display = (
        "register_number",
        "first_name",
        "second_name",
        "last_name",
        "status",
        "cohort",
        "school",
        "pesel",
    )
    list_filter = (
        "school",
        "status",
        "cohort",
    )
    search_fields = (
        "first_name",
        "last_name",
        "pesel",
        "register_number",
    )
    ordering = ("school", "cohort", "register_number", "last_name", "first_name")
    autocomplete_fields = ["cohort"]
    inlines = [StudentHistoryEntryInline, StudentDataCorrectionInline]

    def save_model(self, request: Any, obj: Student, form: Any, change: bool) -> None:
        if change:
            reason = form.cleaned_data.pop("correction_reason", "")

            # Serwis wykona aktualizację i utworzy wpis w StudentDataCorrection
            StudentCorrectionService.update_student_with_history(
                student=obj,
                updated_data=form.cleaned_data,
                author=request.user,
                reason=reason,
            )
        else:
            super().save_model(request, obj, form, change)


@admin.register(StudentDataCorrection)
class StudentDataCorrectionAdmin(admin.ModelAdmin):
    list_display = ("student", "author", "reason", "created_at")
    list_filter = ("created_at", "student__school")
    search_fields = (
        "student__first_name",
        "student__last_name",
        "student__pesel",
        "reason",
    )
    readonly_fields = ("student", "author", "reason", "changed_fields", "created_at")
    ordering = ("-created_at",)

    def has_add_permission(self, request: Any) -> bool:
        return False

    def has_delete_permission(self, request: Any, obj: Any = None) -> bool:
        return False


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

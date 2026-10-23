"use client";

import React, { useCallback } from "react";
import Link from "next/link";
import { api, type ApiSchema } from "@/lib/api";
import { useApiQuery } from "@/lib/api/use-api-query";
import { useAuth, type RoleEnum } from "@/lib/auth";
import { AppLayout } from "@/components/layout";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { DOCUMENT_TYPE_LABELS, formatDate, formatDateTime, fullName, parseChanges } from "./format";
import { StatusBadge } from "./status-badge";

export const STUDENT_ROLES: RoleEnum[] = ["secretariat", "principal", "admin"];

type Student = ApiSchema["StudentDetail"];

function Section({
  title,
  children,
  id,
}: {
  title: string;
  children: React.ReactNode;
  id: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5"
    >
      <h2 id={id} className="text-base font-semibold mb-4">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-100">{value || "—"}</dd>
    </div>
  );
}

function PersonalData({ student }: { student: Student }) {
  return (
    <Section title="Dane ucznia" id="student-data">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Imię" value={student.first_name} />
        <Field label="Drugie imię" value={student.second_name} />
        <Field label="Nazwisko" value={student.last_name} />
        <Field label="Data urodzenia" value={formatDate(student.date_of_birth)} />
        <Field label="Miejsce urodzenia" value={student.place_of_birth} />
        {student.pesel ? (
          <Field label="PESEL" value={<span className="font-mono">{student.pesel}</span>} />
        ) : (
          <Field
            label={`Dokument tożsamości (brak PESEL)`}
            value={
              student.id_document_number
                ? `${DOCUMENT_TYPE_LABELS[student.id_document_type ?? ""] ?? "Dokument"} ${
                    student.id_document_number
                  }`
                : undefined
            }
          />
        )}
        <Field
          label="Nr w księdze uczniów"
          value={<span className="font-mono">{student.register_number}</span>}
        />
        <Field label="Status" value={<StatusBadge status={student.status} />} />
        <Field label="Ostatnia zmiana danych" value={formatDateTime(student.updated_at)} />
      </dl>
    </Section>
  );
}

function CurrentClass({ student }: { student: Student }) {
  return (
    <Section title="Klasa" id="student-class">
      {student.cohort ? (
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Klasa" value={student.cohort.name} />
          <Field label="Poziom" value={String(student.cohort.level)} />
          <Field label="Rok szkolny" value={student.cohort.academic_year_name} />
        </dl>
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Uczeń nie jest przypisany do żadnej klasy.
        </p>
      )}
    </Section>
  );
}

function LearningHistory({ entries }: { entries: Student["history_entries"] }) {
  return (
    <Section title="Historia przebiegu nauki" id="student-history">
      {entries.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Brak wpisów w historii przebiegu nauki.
        </p>
      ) : (
        <ol className="relative border-l border-zinc-200 dark:border-zinc-700 ml-2 space-y-5">
          {entries.map((entry) => {
            const move =
              entry.source_cohort_name || entry.target_cohort_name
                ? [entry.source_cohort_name, entry.target_cohort_name]
                    .map((name) => name ?? "—")
                    .join(" → ")
                : null;
            return (
              <li key={entry.id} className="ml-5">
                <span
                  aria-hidden="true"
                  className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white dark:border-zinc-900 bg-indigo-500"
                />
                <p className="text-sm font-semibold">{entry.event_type_display}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  <time dateTime={entry.event_date}>{formatDate(entry.event_date)}</time>
                  {" · rok szkolny "}
                  {entry.academic_year_name}
                  {move && ` · klasa ${move}`}
                </p>
                {entry.document_number && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">
                    Podstawa: {entry.document_number}
                  </p>
                )}
                {entry.notes && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">{entry.notes}</p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Section>
  );
}

function CorrectionsHistory({ corrections }: { corrections: Student["data_corrections"] }) {
  return (
    <Section title="Historia zmian danych" id="student-corrections">
      {corrections.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Dane ucznia nie były dotąd korygowane.
        </p>
      ) : (
        <ul className="space-y-4">
          {corrections.map((correction) => {
            const changes = parseChanges(correction.changed_fields);
            return (
              <li
                key={correction.id}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4"
              >
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  <time dateTime={correction.created_at}>
                    {formatDateTime(correction.created_at)}
                  </time>
                  {" · "}
                  {correction.author_email ?? "System"}
                </p>
                <p className="text-sm mt-1">
                  <span className="font-medium">Powód: </span>
                  {correction.reason}
                </p>
                {changes.length > 0 && (
                  <table className="mt-3 w-full text-sm">
                    <caption className="sr-only">Zmienione pola</caption>
                    <thead className="text-xs text-zinc-500 dark:text-zinc-400">
                      <tr>
                        <th scope="col" className="text-left font-medium py-1 pr-4">
                          Pole
                        </th>
                        <th scope="col" className="text-left font-medium py-1 pr-4">
                          Było
                        </th>
                        <th scope="col" className="text-left font-medium py-1">
                          Jest
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {changes.map((change) => (
                        <tr
                          key={change.field}
                          className="border-t border-zinc-100 dark:border-zinc-800"
                        >
                          <td className="py-1 pr-4 text-zinc-600 dark:text-zinc-300">
                            {change.label}
                          </td>
                          <td className="py-1 pr-4 line-through text-zinc-400">{change.old}</td>
                          <td className="py-1 font-medium">{change.new}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

function BackLink() {
  return (
    <Link
      href="/students"
      className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
    >
      ← Wróć do listy uczniów
    </Link>
  );
}

export function StudentDetailsContent({ studentId }: { studentId: string }) {
  const { currentSchoolId: schoolId } = useAuth();
  const fetchStudent = useCallback(
    (signal: AbortSignal) =>
      api.get("/api/students/{id}/", {
        schoolId: schoolId ?? "",
        path: { id: studentId },
        signal,
      }),
    [schoolId, studentId]
  );
  const query = useApiQuery(schoolId ? fetchStudent : null);

  if (!schoolId) {
    return (
      <EmptyState
        title="Nie wybrano szkoły"
        message="Twoje konto nie ma aktywnego członkostwa w żadnej szkole."
      />
    );
  }
  if (query.error) {
    if (query.error.status === 404) {
      return (
        <div className="space-y-4">
          <EmptyState
            title="Nie znaleziono ucznia"
            message="Uczeń nie istnieje albo należy do innej szkoły."
          />
          <BackLink />
        </div>
      );
    }
    return (
      <ErrorState
        title="Nie udało się pobrać danych ucznia"
        message={query.error.message}
        code={query.error.code}
        onRetry={query.error.isForbidden ? undefined : query.reload}
      />
    );
  }
  if (!query.data) {
    return <LoadingState message="Ładowanie danych ucznia..." />;
  }

  const student = query.data;
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <BackLink />
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{fullName(student)}</h1>
          <StatusBadge status={student.status} />
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Nr w księdze uczniów:{" "}
          <span className="font-mono text-zinc-700 dark:text-zinc-300">
            {student.register_number}
          </span>
        </p>
      </div>
      <PersonalData student={student} />
      <CurrentClass student={student} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <LearningHistory entries={student.history_entries} />
        <CorrectionsHistory corrections={student.data_corrections} />
      </div>
    </div>
  );
}

export function StudentDetails({ studentId }: { studentId: string }) {
  return (
    <AppLayout
      allowedRoles={STUDENT_ROLES}
      breadcrumbs={[
        { label: "Pulpit", href: "/" },
        { label: "Księga uczniów", href: "/students" },
        { label: "Szczegóły ucznia" },
      ]}
    >
      <div className="max-w-5xl mx-auto">
        <StudentDetailsContent studentId={studentId} />
      </div>
    </AppLayout>
  );
}

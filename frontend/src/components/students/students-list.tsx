"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Operation } from "@/lib/api/types";
import { useApiQuery } from "@/lib/api/use-api-query";
import { useAuth } from "@/lib/auth";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { STATUS_LABELS, formatDate, identifier, registerName, type StudentStatus } from "./format";
import { StatusBadge } from "./status-badge";

export const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

type StudentsQuery = NonNullable<Operation<"/api/students/", "get">["parameters"]["query"]>;
type Ordering = NonNullable<StudentsQuery["ordering"]>;
type SortField = Exclude<Ordering, `-${string}`>;

const DEFAULT_SORT: SortField = "last_name";
const SORT_FIELDS: SortField[] = [
  "last_name",
  "first_name",
  "register_number",
  "date_of_birth",
  "created_at",
];
const STATUSES = Object.keys(STATUS_LABELS) as StudentStatus[];

function parseOrdering(value: string | null): Ordering | undefined {
  const field = value?.replace(/^-/, "");
  return SORT_FIELDS.includes(field as SortField) ? (value as Ordering) : undefined;
}

function parsePage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 1 ? page : 1;
}

/** Filters live in the URL (shareable, survive "back"), except the search text:
 * it can contain a name or PESEL, which must not end up in URLs or browser history. */
function useListParams() {
  const params = useSearchParams();
  const status = params.get("status");
  return {
    page: parsePage(params.get("page")),
    status: STATUSES.includes(status as StudentStatus) ? (status as StudentStatus) : undefined,
    cohort: params.get("cohort") || undefined,
    ordering: parseOrdering(params.get("ordering")),
  };
}

function SortHeader({
  field,
  label,
  ordering,
  onSort,
}: {
  field: SortField;
  label: string;
  ordering: Ordering | undefined;
  onSort: (field: SortField) => void;
}) {
  const current = ordering ?? DEFAULT_SORT;
  const active = current.replace(/^-/, "") === field;
  const descending = current.startsWith("-");
  const sort = active ? (descending ? "descending" : "ascending") : "none";

  return (
    <th scope="col" aria-sort={sort} className="px-4 py-3 text-left font-medium">
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        {label}
        <span aria-hidden="true" className={active ? "text-indigo-600" : "text-zinc-300"}>
          {active && descending ? "↓" : "↑"}
        </span>
      </button>
    </th>
  );
}

export function StudentsList() {
  const { currentSchoolId: schoolId } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { page, status, cohort, ordering } = useListParams();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const updateParams = useCallback(
    (changes: Record<string, string | undefined>, resetPage = true) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      if (resetPage) next.delete("page");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    const value = searchInput.trim();
    if (value === search) return;
    const timer = setTimeout(() => {
      setSearch(value);
      if (page > 1) updateParams({});
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput, search, page, updateParams]);

  const fetchStudents = useCallback(
    (signal: AbortSignal) =>
      api.get("/api/students/", {
        schoolId: schoolId ?? "",
        signal,
        query: {
          page,
          page_size: PAGE_SIZE,
          status,
          cohort,
          ordering,
          search: search || undefined,
        },
      }),
    [schoolId, page, status, cohort, ordering, search]
  );
  const fetchCohorts = useCallback(
    (signal: AbortSignal) =>
      api.get("/api/cohorts/", { schoolId: schoolId ?? "", signal, query: { page_size: 100 } }),
    [schoolId]
  );

  const students = useApiQuery(schoolId ? fetchStudents : null);
  const cohorts = useApiQuery(schoolId ? fetchCohorts : null);

  const hasFilters = Boolean(status || cohort || search);
  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    updateParams({ status: undefined, cohort: undefined });
  };

  const toggleSort = (field: SortField) => {
    const current = ordering ?? DEFAULT_SORT;
    const next: Ordering = current === field ? (`-${field}` as Ordering) : field;
    updateParams({ ordering: next });
  };

  if (!schoolId) {
    return (
      <EmptyState
        title="Nie wybrano szkoły"
        message="Twoje konto nie ma aktywnego członkostwa w żadnej szkole. Skontaktuj się z administratorem."
      />
    );
  }

  const result = students.data ?? students.previousData;
  const cohortOptions = (cohorts.data ?? cohorts.previousData)?.results ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1">
          <label
            htmlFor="student-search"
            className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
          >
            Szukaj ucznia
          </label>
          <input
            id="student-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Nazwisko, imię, PESEL lub nr w księdze"
            autoComplete="off"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label
            htmlFor="student-status"
            className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
          >
            Status
          </label>
          <select
            id="student-status"
            value={status ?? ""}
            onChange={(event) => updateParams({ status: event.target.value || undefined })}
            className="w-full md:w-44 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
          >
            <option value="">Wszystkie</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="student-cohort"
            className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
          >
            Klasa
          </label>
          <select
            id="student-cohort"
            value={cohort ?? ""}
            onChange={(event) => updateParams({ cohort: event.target.value || undefined })}
            className="w-full md:w-48 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
          >
            <option value="">Wszystkie klasy</option>
            {cohortOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} ({option.academic_year_name})
              </option>
            ))}
          </select>
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
          >
            Wyczyść filtry
          </button>
        )}
      </div>

      {students.error ? (
        students.error.status === 404 && page > 1 ? (
          <EmptyState
            title="Ta strona wyników nie istnieje"
            message="Lista uczniów zmieniła się albo numer strony jest nieprawidłowy."
            action={{ label: "Przejdź do pierwszej strony", onClick: () => updateParams({}) }}
          />
        ) : students.error.isForbidden ? (
          <ErrorState
            title="Brak dostępu do danych uczniów"
            message={students.error.message}
            code={students.error.code}
          />
        ) : (
          <ErrorState
            title="Nie udało się pobrać listy uczniów"
            message={students.error.message}
            code={students.error.code}
            onRetry={students.reload}
          />
        )
      ) : !result ? (
        <LoadingState message="Ładowanie listy uczniów..." />
      ) : result.count === 0 ? (
        hasFilters ? (
          <EmptyState
            title="Brak wyników"
            message="Żaden uczeń nie pasuje do wybranych filtrów."
            action={{ label: "Wyczyść filtry", onClick: clearFilters }}
          />
        ) : (
          <EmptyState
            title="Brak zarejestrowanych uczniów"
            message="Księga uczniów jest obecnie pusta. Dane można zaimportować z pliku CSV/JSON."
          />
        )
      ) : (
        <>
          <p className="text-sm text-zinc-500 dark:text-zinc-400" aria-live="polite">
            Liczba uczniów: <span className="font-semibold">{result.count}</span>
          </p>
          <div
            className={`overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-opacity ${
              students.isLoading ? "opacity-60" : ""
            }`}
            aria-busy={students.isLoading}
          >
            <table className="min-w-full text-sm">
              <caption className="sr-only">Lista uczniów</caption>
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                <tr>
                  <SortHeader
                    field="register_number"
                    label="Nr w księdze"
                    ordering={ordering}
                    onSort={toggleSort}
                  />
                  <SortHeader
                    field="last_name"
                    label="Uczeń"
                    ordering={ordering}
                    onSort={toggleSort}
                  />
                  <th scope="col" className="px-4 py-3 text-left font-medium">
                    Identyfikator
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">
                    Klasa
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">
                    Status
                  </th>
                  <SortHeader
                    field="date_of_birth"
                    label="Data urodzenia"
                    ordering={ordering}
                    onSort={toggleSort}
                  />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {result.results.map((student) => (
                  <tr key={student.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                      {student.register_number}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/students/${student.id}`}
                        className="font-medium text-zinc-900 hover:text-indigo-600 dark:text-zinc-100 dark:hover:text-indigo-400"
                      >
                        {registerName(student)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                      {identifier(student)}
                    </td>
                    <td className="px-4 py-3">
                      {student.cohort
                        ? `${student.cohort.name} (${student.cohort.academic_year_name})`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={student.status} />
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {formatDate(student.date_of_birth)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav
            aria-label="Paginacja listy uczniów"
            className="flex items-center justify-between text-sm"
          >
            <span className="text-zinc-500 dark:text-zinc-400">
              Strona {result.page} z {result.total_pages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={result.page <= 1 || students.isLoading}
                onClick={() => updateParams({ page: String(result.page - 1) }, false)}
                className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 font-medium disabled:opacity-40"
              >
                Poprzednia
              </button>
              <button
                type="button"
                disabled={result.page >= result.total_pages || students.isLoading}
                onClick={() => updateParams({ page: String(result.page + 1) }, false)}
                className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 font-medium disabled:opacity-40"
              >
                Następna
              </button>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout";
import { EmptyState } from "@/components/ui/states";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { PaginatedStudentResponse, StudentStatus } from "@/types/student";

export default function StudentsPage() {
  const { currentSchoolId } = useAuth();

  const [data, setData] = useState<PaginatedStudentResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  useEffect(() => {
    if (!currentSchoolId) return;

    let isMounted = true;
    void (async () => {
      try {
        const json = await api.get("/api/students/", {
          schoolId: currentSchoolId,
          query: {
            page,
            ...(search ? { search } : {}),
            ...(status ? { status: status as StudentStatus } : {}),
          },
        });
        if (!isMounted) return;
        setData(json);
        setError(null);
      } catch (err: unknown) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Wystąpił błąd podczas ładowania danych.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [currentSchoolId, page, search, status]);

  const isInitialEmpty = !loading && !error && data && data.count === 0 && !search && !status;

  return (
    <AppLayout allowedRoles={["secretariat", "principal", "admin"]}>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Księga uczniów
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Ewidencja uczniów, dane opiekunów i historia przebiegu nauki
            </p>
          </div>
        </div>

        {/* Pasek filtrowania i szukania */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Szukaj po nazwisku, imieniu lub PESEL..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
              setLoading(true);
            }}
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
              setLoading(true);
            }}
            className="px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          >
            <option value="">Wszystkie statusy</option>
            <option value="ACTIVE">Uczęszcza (Aktywny)</option>
            <option value="GRADUATED">Absolwent</option>
            <option value="WITHDRAWN">Odszedł / Skreślony</option>
          </select>
        </div>

        {/* Błąd */}
        {error && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Pusta księga vs Widok tabeli */}
        {isInitialEmpty ? (
          <EmptyState
            title="Brak zarejestrowanych uczniów"
            message="Księga uczniów jest obecnie pusta. Możesz zaimportować dane z pliku CSV/JSON."
          />
        ) : (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    <th className="p-3.5">Nr w księdze</th>
                    <th className="p-3.5">Imię i nazwisko</th>
                    <th className="p-3.5">Klasa</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Data urodzenia</th>
                    <th className="p-3.5 text-right">Akcje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                        Pobieranie listy uczniów...
                      </td>
                    </tr>
                  ) : data?.results.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                        Nie znaleziono uczniów spełniających kryteria wyszukiwania.
                      </td>
                    </tr>
                  ) : (
                    data?.results.map((student) => (
                      <tr
                        key={student.id}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="p-3.5 font-medium">{student.register_number}</td>
                        <td className="p-3.5 font-semibold">
                          {student.first_name}{" "}
                          {student.second_name ? `${student.second_name} ` : ""}
                          {student.last_name}
                        </td>
                        <td className="p-3.5 text-zinc-600 dark:text-zinc-400">
                          {student.cohort?.name || "Brak"}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              student.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : student.status === "GRADUATED"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                  : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                            }`}
                          >
                            {student.status_display}
                          </span>
                        </td>
                        <td className="p-3.5 text-zinc-600 dark:text-zinc-400">
                          {student.date_of_birth}
                        </td>
                        <td className="p-3.5 text-right">
                          <Link
                            href={`/students/${student.id}`}
                            className="text-xs font-medium px-2.5 py-1 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 transition-colors"
                          >
                            Karta ucznia
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginacja */}
            {data && data.total_pages > 1 && (
              <div className="flex items-center justify-between p-3.5 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
                <span>
                  Strona <strong className="text-zinc-900 dark:text-zinc-100">{data.page}</strong> z{" "}
                  <strong className="text-zinc-900 dark:text-zinc-100">{data.total_pages}</strong> (
                  {data.count} uczniów)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setPage((p) => Math.max(p - 1, 1));
                      setLoading(true);
                    }}
                    disabled={page === 1 || loading}
                    className="px-2.5 py-1 rounded border border-zinc-300 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Poprzednia
                  </button>
                  <button
                    onClick={() => {
                      setPage((p) => Math.min(p + 1, data.total_pages));
                      setLoading(true);
                    }}
                    disabled={page === data.total_pages || loading}
                    className="px-2.5 py-1 rounded border border-zinc-300 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Następna
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

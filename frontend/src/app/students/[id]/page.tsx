"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { api, type ApiSchema } from "@/lib/api";

type StudentDetail = ApiSchema["StudentDetail"];

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { currentSchoolId } = useAuth();

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentSchoolId || !id) return;

    let isMounted = true;
    void (async () => {
      try {
        const json = await api.get("/api/students/{id}/", {
          path: { id },
          schoolId: currentSchoolId,
        });
        if (!isMounted) return;
        setStudent(json);
        setError(null);
      } catch (err: unknown) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Nie udało się pobrać danych ucznia.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [currentSchoolId, id]);

  return (
    <AppLayout allowedRoles={["secretariat", "principal", "admin"]}>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <Link
            href="/students"
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            ← Wróć do listy uczniów
          </Link>
        </div>

        {loading && <p className="text-zinc-500">Ładowanie karty ucznia...</p>}
        {error && <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

        {student && (
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {student.first_name} {student.second_name ? `${student.second_name} ` : ""}
                {student.last_name}
              </h1>
              <p className="text-sm text-zinc-500">Nr w księdze: {student.register_number}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-zinc-500">PESEL:</span>{" "}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {student.pesel || "Brak"}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">Data i miejsce urodzenia:</span>{" "}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {student.date_of_birth} ({student.place_of_birth})
                </span>
              </div>
              <div>
                <span className="text-zinc-500">Klasa:</span>{" "}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {student.cohort?.name || "Brak"}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">Status:</span>{" "}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {student.status_display}
                </span>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                Historia przebiegu nauki
              </h2>
              {student.history_entries.length === 0 ? (
                <p className="text-sm text-zinc-500">Brak wpisów w historii.</p>
              ) : (
                <div className="space-y-2">
                  {student.history_entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm"
                    >
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {entry.event_type_display} - {entry.event_date}
                      </div>
                      <div className="text-xs text-zinc-500">
                        Rok szkolny: {entry.academic_year_name}
                        {entry.document_number && ` | Decyzja: ${entry.document_number}`}
                      </div>
                      {entry.notes && (
                        <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                          {entry.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

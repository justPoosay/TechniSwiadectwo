"use client";

import React, { Suspense } from "react";
import { AppLayout } from "@/components/layout";
import { LoadingState } from "@/components/ui/states";
import { StudentsList } from "@/components/students/students-list";
import { STUDENT_ROLES } from "@/components/students/student-details";

export default function StudentsPage() {
  return (
    <AppLayout allowedRoles={STUDENT_ROLES}>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Księga uczniów
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Ewidencja uczniów, klasy i historia przebiegu nauki
          </p>
        </div>
        {/* useSearchParams needs a Suspense boundary (filters are kept in the URL). */}
        <Suspense fallback={<LoadingState message="Ładowanie listy uczniów..." />}>
          <StudentsList />
        </Suspense>
      </div>
    </AppLayout>
  );
}

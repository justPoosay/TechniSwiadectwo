"use client";

import React from "react";
import { AppLayout } from "@/components/layout";
import { EmptyState } from "@/components/ui/states";

export default function StudentsPage() {
  return (
    <AppLayout allowedRoles={["secretariat", "principal", "admin"]}>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Księga uczniów
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Ewidencja uczniów, dane opiekunów i historia przebiegu nauki
            </p>
          </div>
        </div>

        <EmptyState
          title="Brak zarejestrowanych uczniów"
          message="Księga uczniów jest obecnie pusta. Możesz zaimportować dane z pliku CSV/JSON."
        />
      </div>
    </AppLayout>
  );
}

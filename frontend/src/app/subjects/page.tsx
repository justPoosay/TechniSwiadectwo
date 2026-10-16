"use client";

import React from "react";
import { AppLayout } from "@/components/layout";
import { EmptyState } from "@/components/ui/states";

export default function SubjectsPage() {
  return (
    <AppLayout allowedRoles={["teacher", "admin"]}>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Moje przedmioty (Widok Nauczyciela)
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Prowadzone zajęcia edukacyjne, oceny cząstkowe i frekwencja uczniów
            </p>
          </div>
        </div>

        <EmptyState
          title="Brak przydzielonych przedmiotów"
          message="Brak przypisanych grup lekcyjnych w bieżącym semestrze szkolnym."
        />
      </div>
    </AppLayout>
  );
}

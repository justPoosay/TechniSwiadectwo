"use client";

import React from "react";
import { AppLayout } from "@/components/layout";
import { EmptyState } from "@/components/ui/states";

export default function MyClassPage() {
  return (
    <AppLayout allowedRoles={["homeroom_teacher", "admin"]}>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Moja klasa (Widok Wychowawcy)
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Zarządzanie powierzoną klasą, arkuszami ocen i wnioskami o świadectwa
            </p>
          </div>
        </div>

        <EmptyState
          title="Brak przypisanych uczniów"
          message="Nie dodano jeszcze uczniów do Twojej klasy lub trwa synchronizacja danych z księgą uczniów."
        />
      </div>
    </AppLayout>
  );
}

"use client";

import React from "react";
import { AppLayout } from "@/components/layout";
import { EmptyState } from "@/components/ui/states";

export default function AuditPage() {
  return (
    <AppLayout allowedRoles={["principal", "admin"]}>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Dziennik audytu
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Historia operacji, zmian danych uczniów i wygenerowanych dokumentów
            </p>
          </div>
        </div>

        <EmptyState
          title="Brak wpisów audytowych"
          message="Nie zarejestrowano jeszcze żadnych operacji audytowych dla wybranej szkoły."
        />
      </div>
    </AppLayout>
  );
}

"use client";

import React from "react";
import { AppLayout } from "@/components/layout";
import { EmptyState } from "@/components/ui/states";

export default function CertificatesPage() {
  return (
    <AppLayout allowedRoles={["homeroom_teacher", "secretariat", "principal", "admin"]}>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Świadectwa szkolne
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Generowanie, weryfikacja i pobieranie świadectw w formacie PDF
            </p>
          </div>
        </div>

        <EmptyState
          title="Brak wygenerowanych świadectw"
          message="Nie wygenerowano jeszcze żadnych świadectw w wybranym roku szkolnym."
        />
      </div>
    </AppLayout>
  );
}

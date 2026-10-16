import React, { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { LoadingState } from "@/components/ui/states";

export const metadata: Metadata = {
  title: "Logowanie | TechniŚwiadectwo",
  description: "Zaloguj się do systemu TechniŚwiadectwo",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <Suspense fallback={<LoadingState message="Ładowanie formularza logowania..." />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}

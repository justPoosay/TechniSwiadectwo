"use client";

import React from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout";
import { useAuth, ROLE_LABELS } from "@/lib/auth";

export default function Home() {
  const { user, currentMembership } = useAuth();
  const role = currentMembership?.role;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Welcome Banner */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 md:p-8 shadow-xs border border-zinc-200/80 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Techni Świadectwo
              </h1>
              {role && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {ROLE_LABELS[role] || role}
                </span>
              )}
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm max-w-2xl">
              Witaj,{" "}
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {user?.full_name || user?.email || "Użytkowniku"}
              </span>
              ! Szkoła:{" "}
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {currentMembership?.school_name || "Brak wybranej szkoły"}
              </span>
              . Moduł przygotowywania dokumentacji szkolnej i arkuszy ocen.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            {role === "homeroom_teacher" && (
              <Link
                href="/my-class"
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
              >
                Przejdź do klasy
              </Link>
            )}
            {role === "teacher" && (
              <Link
                href="/subjects"
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
              >
                Moje przedmioty
              </Link>
            )}
            {(role === "secretariat" || role === "principal" || role === "admin") && (
              <Link
                href="/students"
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
              >
                Księga uczniów
              </Link>
            )}
          </div>
        </div>

        {/* Quick Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              Arkusze ocen i świadectwa
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Generowanie jednolitych dokumentów szkolnych w formacie PDF na podstawie danych
              uczniów.
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              Izolacja danych i bezpieczeństwo
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Pełna separacja szkół (nagłówek X-School-ID) oraz ścisła autoryzacja obiektowa.
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              Śledzenie zmian i audyt
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Niezmienne rejestrowanie każdej operacji na danych osobowych i dokumentach szkolnych.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

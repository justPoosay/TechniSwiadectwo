"use client";

import React from "react";
import { useAuth } from "@/lib/auth";

export function SchoolSelector() {
  const { user, currentSchoolId, switchSchool } = useAuth();

  const memberships = user?.memberships || [];
  const activeMemberships = memberships.filter((m) => m.is_active !== false);

  if (activeMemberships.length === 0) {
    return (
      <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-900">
        Brak aktywnego przypisania do szkoły
      </div>
    );
  }

  if (activeMemberships.length === 1) {
    const single = activeMemberships[0];
    return (
      <div
        data-testid="single-school-display"
        className="flex items-center space-x-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4 text-indigo-600 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        <span className="truncate max-w-[200px]">{single.school_name || "Szkoła"}</span>
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center" data-testid="school-selector">
      <label htmlFor="school-select" className="sr-only">
        Wybierz szkołę
      </label>
      <select
        id="school-select"
        value={currentSchoolId || ""}
        onChange={(e) => switchSchool(e.target.value)}
        className="text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 pr-7 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
      >
        {activeMemberships.map((m) => (
          <option key={m.id} value={m.school}>
            {m.school_name} ({m.role_display})
          </option>
        ))}
      </select>
    </div>
  );
}

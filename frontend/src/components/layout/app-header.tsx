"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, ROLE_LABELS, type RoleEnum } from "@/lib/auth";
import { SchoolSelector } from "./school-selector";

interface AppHeaderProps {
  onToggleSidebar?: () => void;
}

const ROLE_BADGE_COLORS: Record<RoleEnum, string> = {
  secretariat:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  teacher:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  homeroom_teacher:
    "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  principal:
    "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  admin:
    "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
};

export function AppHeader({ onToggleSidebar }: AppHeaderProps) {
  const { user, logout, currentMembership } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.replace("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const role = currentMembership?.role;
  const roleLabel = role ? ROLE_LABELS[role] || role : "Użytkownik";
  const badgeColor = role ? ROLE_BADGE_COLORS[role] : "bg-zinc-100 text-zinc-800";

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center space-x-3">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 md:hidden rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Przełącz menu boczne"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        )}

        <Link href="/" className="flex items-center space-x-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100 hidden sm:inline">
            TechniŚwiadectwo
          </span>
        </Link>
      </div>

      <div className="flex items-center space-x-3 md:space-x-5">
        <SchoolSelector />

        {user && (
          <div className="flex items-center space-x-3">
            <div className="hidden lg:flex flex-col items-end text-right">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                {user.full_name || user.email}
              </span>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${badgeColor}`}
              >
                {roleLabel}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              aria-label="Wyloguj się"
              className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors border border-zinc-200 dark:border-zinc-700"
            >
              {isLoggingOut ? (
                <div className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-red-500 rounded-full animate-spin" />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              )}
              <span className="hidden sm:inline">Wyloguj</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

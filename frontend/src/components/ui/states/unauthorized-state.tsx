import React from "react";
import Link from "next/link";
import { ROLE_LABELS, type RoleEnum } from "@/lib/auth";

interface UnauthorizedStateProps {
  currentRole?: RoleEnum;
  requiredRoles?: RoleEnum[];
  className?: string;
}

export function UnauthorizedState({
  currentRole,
  requiredRoles,
  className = "",
}: UnauthorizedStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center p-8 text-center bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl my-4 ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
        Brak uprawnień (403)
      </h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md mb-2">
        Nie posiadasz uprawnień wymaganych do wyświetlenia tego widoku.
      </p>
      {currentRole && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
          Twoja aktualna rola w szkole:{" "}
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
            {ROLE_LABELS[currentRole] || currentRole}
          </span>
          {requiredRoles && requiredRoles.length > 0 && (
            <> (wymagana rola: {requiredRoles.map((r) => ROLE_LABELS[r] || r).join(" lub ")})</>
          )}
        </p>
      )}
      <Link
        href="/"
        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
      >
        Wróć do strony głównej
      </Link>
    </div>
  );
}

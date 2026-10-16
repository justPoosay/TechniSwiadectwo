import React from "react";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({
  message = "Ładowanie danych...",
  className = "",
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center p-8 text-center min-h-[200px] ${className}`}
    >
      <div className="relative flex items-center justify-center mb-4">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{message}</p>
    </div>
  );
}

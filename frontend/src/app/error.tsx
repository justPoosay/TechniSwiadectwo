"use client";

import React, { useEffect } from "react";
import { ErrorState } from "@/components/ui/states";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App boundary error caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-md w-full">
        <ErrorState
          title="Błąd aplikacji"
          message={error.message || "Wystąpił nieoczekiwany błąd podczas ładowania widoku."}
          code={error.digest}
          onRetry={reset}
        />
      </div>
    </div>
  );
}

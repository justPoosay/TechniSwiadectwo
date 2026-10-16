import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LoadingState, ErrorState, EmptyState, UnauthorizedState } from "../index";

describe("UI States components", () => {
  describe("LoadingState", () => {
    it("renders loading message and status role", () => {
      render(<LoadingState message="Trwa wczytywanie ocen..." />);
      expect(screen.getByRole("status")).toBeDefined();
      expect(screen.getByText("Trwa wczytywanie ocen...")).toBeDefined();
    });
  });

  describe("ErrorState", () => {
    it("renders error title, message, code and triggers retry", () => {
      const onRetry = vi.fn();
      render(
        <ErrorState
          title="Błąd połączenia"
          message="Nie udało się połączyć z serwerem."
          code="backend_unavailable"
          onRetry={onRetry}
        />
      );

      expect(screen.getByRole("alert")).toBeDefined();
      expect(screen.getByText("Błąd połączenia")).toBeDefined();
      expect(screen.getByText("Nie udało się połączyć z serwerem.")).toBeDefined();
      expect(screen.getByText("Kod błędu: backend_unavailable")).toBeDefined();

      const retryBtn = screen.getByRole("button", { name: /spróbuj ponownie/i });
      fireEvent.click(retryBtn);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe("EmptyState", () => {
    it("renders empty state with title, message and action", () => {
      const onAction = vi.fn();
      render(
        <EmptyState
          title="Brak uczniów"
          message="Nie zarejestrowano uczniów w tej klasie."
          action={{ label: "Dodaj ucznia", onClick: onAction }}
        />
      );

      expect(screen.getByText("Brak uczniów")).toBeDefined();
      expect(screen.getByText("Nie zarejestrowano uczniów w tej klasie.")).toBeDefined();

      const actionBtn = screen.getByRole("button", { name: "Dodaj ucznia" });
      fireEvent.click(actionBtn);
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });

  describe("UnauthorizedState", () => {
    it("renders 403 forbidden message and role context", () => {
      render(<UnauthorizedState currentRole="teacher" requiredRoles={["homeroom_teacher"]} />);

      expect(screen.getByRole("alert")).toBeDefined();
      expect(screen.getByText(/brak uprawnień \(403\)/i)).toBeDefined();
      expect(screen.getByText(/twoja aktualna rola w szkole:/i)).toBeDefined();
      expect(screen.getByText("Nauczyciel")).toBeDefined();
      expect(screen.getByRole("link", { name: /wróć do strony głównej/i })).toBeDefined();
    });
  });
});

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LoginForm } from "../login-form";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

const mockReplace = vi.fn();
const mockGet = vi.fn().mockReturnValue(null);

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: mockGet,
  }),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(),
}));

describe("LoginForm", () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReturnValue(null);
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      currentMembership: null,
      currentSchoolId: null,
      login: mockLogin,
      logout: vi.fn(),
      switchSchool: vi.fn(),
      refreshUser: vi.fn(),
    });
  });

  it("renders form elements properly", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/adres e-mail/i)).toBeDefined();
    expect(screen.getByLabelText(/^hasło$/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /zaloguj się/i })).toBeDefined();
  });

  it("validates required fields on submit", async () => {
    render(<LoginForm />);

    fireEvent.click(screen.getByRole("button", { name: /zaloguj się/i }));

    expect(await screen.findByText(/adres e-mail jest wymagany/i)).toBeDefined();
    expect(await screen.findByText(/hasło jest wymagane/i)).toBeDefined();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("validates email format", async () => {
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/adres e-mail/i), {
      target: { value: "invalid-email" },
    });
    fireEvent.change(screen.getByLabelText(/^hasło$/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /zaloguj się/i }));

    expect(await screen.findByText(/wprowadź poprawny adres e-mail/i)).toBeDefined();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("submits valid credentials and redirects to default or next URL", async () => {
    mockLogin.mockResolvedValueOnce({});
    mockGet.mockReturnValue("/dashboard");

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/adres e-mail/i), {
      target: { value: "user@szkola.pl" },
    });
    fireEvent.change(screen.getByLabelText(/^hasło$/i), {
      target: { value: "secret123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /zaloguj się/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: "user@szkola.pl",
        password: "secret123",
      });
      expect(mockReplace).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("displays server error message on login failure", async () => {
    const error = new ApiError(400, "Nieprawidłowy login lub hasło.", "validation_error", {
      email: ["Użytkownik o podanym adresie e-mail nie istnieje."],
    });
    mockLogin.mockRejectedValueOnce(error);

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/adres e-mail/i), {
      target: { value: "wrong@szkola.pl" },
    });
    fireEvent.change(screen.getByLabelText(/^hasło$/i), {
      target: { value: "wrongpass" },
    });

    fireEvent.click(screen.getByRole("button", { name: /zaloguj się/i }));

    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByText("Nieprawidłowy login lub hasło.")).toBeDefined();
    expect(screen.getByText("Użytkownik o podanym adresie e-mail nie istnieje.")).toBeDefined();
  });

  it("toggles password visibility", () => {
    render(<LoginForm />);

    const passwordInput = screen.getByLabelText(/^hasło$/i) as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    const toggleButton = screen.getByLabelText(/pokaż hasło/i);
    fireEvent.click(toggleButton);

    expect(passwordInput.type).toBe("text");

    const hideButton = screen.getByLabelText(/ukryj hasło/i);
    fireEvent.click(hideButton);

    expect(passwordInput.type).toBe("password");
  });

  it("redirects if already authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "1",
        email: "a@b.pl",
        full_name: "A B",
        first_name: "A",
        last_name: "B",
        memberships: [],
      },
      isLoading: false,
      isAuthenticated: true,
      currentMembership: null,
      currentSchoolId: null,
      login: mockLogin,
      logout: vi.fn(),
      switchSchool: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(<LoginForm />);

    expect(mockReplace).toHaveBeenCalledWith("/");
  });
});

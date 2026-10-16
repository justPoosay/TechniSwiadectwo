import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProtectedRoute } from "../protected-route";
import { useAuth } from "@/lib/auth";

const mockReplace = vi.fn();
let currentPathname = "/";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
  }),
  usePathname: () => currentPathname,
}));

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(),
  ROLE_LABELS: {
    secretariat: "Sekretariat",
    teacher: "Nauczyciel",
    homeroom_teacher: "Wychowawca",
    principal: "Dyrekcja",
    admin: "Administrator",
  },
}));

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentPathname = "/";
  });

  it("renders loading state when session is loading", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      currentMembership: null,
      currentSchoolId: null,
      login: vi.fn(),
      logout: vi.fn(),
      switchSchool: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText(/weryfikacja sesji/i)).toBeDefined();
    expect(screen.queryByText("Protected Content")).toBeNull();
  });

  it("redirects unauthenticated user to /login", () => {
    currentPathname = "/students";
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      currentMembership: null,
      currentSchoolId: null,
      login: vi.fn(),
      logout: vi.fn(),
      switchSchool: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(mockReplace).toHaveBeenCalledWith("/login?next=%2Fstudents");
    expect(screen.queryByText("Protected Content")).toBeNull();
  });

  it("renders children when user is authenticated", () => {
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
      login: vi.fn(),
      logout: vi.fn(),
      switchSchool: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("Protected Content")).toBeDefined();
  });

  it("renders UnauthorizedState when user does not have allowed role", () => {
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
      currentMembership: {
        id: "m1",
        school: "s1",
        school_name: "Szkoła 1",
        role: "teacher",
        role_display: "Nauczyciel",
        is_active: true,
      },
      currentSchoolId: "s1",
      login: vi.fn(),
      logout: vi.fn(),
      switchSchool: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(
      <ProtectedRoute allowedRoles={["homeroom_teacher", "admin"]}>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText("Protected Content")).toBeNull();
    expect(screen.getByText(/brak uprawnień/i)).toBeDefined();
    expect(screen.getByText(/twoja aktualna rola w szkole:/i)).toBeDefined();
    expect(screen.getByText("Nauczyciel")).toBeDefined();
  });
});

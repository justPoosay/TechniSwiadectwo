import React from "react";
import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import Home from "../page";
import { useAuth } from "@/lib/auth";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
  usePathname: () => "/",
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

test("renders Techni Świadectwo heading", () => {
  vi.mocked(useAuth).mockReturnValue({
    user: {
      id: "1",
      email: "test@szkola.pl",
      first_name: "Jan",
      last_name: "Kowalski",
      full_name: "Jan Kowalski",
      memberships: [
        {
          id: "m1",
          school: "s1",
          school_name: "Technikum nr 1",
          role: "homeroom_teacher",
          role_display: "Wychowawca",
          is_active: true,
        },
      ],
    },
    isLoading: false,
    isAuthenticated: true,
    currentMembership: {
      id: "m1",
      school: "s1",
      school_name: "Technikum nr 1",
      role: "homeroom_teacher",
      role_display: "Wychowawca",
      is_active: true,
    },
    currentSchoolId: "s1",
    login: vi.fn(),
    logout: vi.fn(),
    switchSchool: vi.fn(),
    refreshUser: vi.fn(),
  });

  render(<Home />);
  const heading = screen.getByRole("heading", { level: 1, name: /techni świadectwo/i });
  expect(heading).toBeDefined();
});

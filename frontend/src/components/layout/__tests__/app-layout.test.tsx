import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppLayout } from "../app-layout";
import { AppSidebar } from "../app-sidebar";
import { AppHeader } from "../app-header";
import { Breadcrumbs } from "../breadcrumbs";
import { SchoolSelector } from "../school-selector";
import { useAuth, type User } from "@/lib/auth";

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

const mockTeacherUser: User = {
  id: "u-1",
  email: "teacher@szkola.pl",
  first_name: "Jan",
  last_name: "Kowalski",
  full_name: "Jan Kowalski",
  memberships: [
    {
      id: "m-1",
      school: "s-1",
      school_name: "Liceum Ogólnokształcące nr 1",
      role: "teacher",
      role_display: "Nauczyciel",
      is_active: true,
    },
  ],
};

const mockHomeroomUser: User = {
  id: "u-2",
  email: "homeroom@szkola.pl",
  first_name: "Anna",
  last_name: "Nowak",
  full_name: "Anna Nowak",
  memberships: [
    {
      id: "m-2",
      school: "s-1",
      school_name: "Liceum Ogólnokształcące nr 1",
      role: "homeroom_teacher",
      role_display: "Wychowawca",
      is_active: true,
    },
  ],
};

describe("App Layout & Shell components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentPathname = "/";
  });

  describe("AppSidebar role separation", () => {
    it("renders teacher specific links when user is a teacher", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: mockTeacherUser,
        isLoading: false,
        isAuthenticated: true,
        currentMembership: mockTeacherUser.memberships[0],
        currentSchoolId: "s-1",
        login: vi.fn(),
        logout: vi.fn(),
        switchSchool: vi.fn(),
        refreshUser: vi.fn(),
      });

      render(<AppSidebar />);

      expect(screen.getByText("Widok Nauczyciela")).toBeDefined();
      expect(screen.getByText("Moje przedmioty")).toBeDefined();
      expect(screen.getByText("Oceny cząstkowe")).toBeDefined();
      // Should NOT contain homeroom teacher links
      expect(screen.queryByText("Moja klasa")).toBeNull();
      expect(screen.queryByText("Świadectwa klasy")).toBeNull();
    });

    it("renders homeroom teacher specific links when user is a homeroom teacher", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: mockHomeroomUser,
        isLoading: false,
        isAuthenticated: true,
        currentMembership: mockHomeroomUser.memberships[0],
        currentSchoolId: "s-1",
        login: vi.fn(),
        logout: vi.fn(),
        switchSchool: vi.fn(),
        refreshUser: vi.fn(),
      });

      render(<AppSidebar />);

      expect(screen.getByText("Widok Wychowawcy")).toBeDefined();
      expect(screen.getByText("Moja klasa")).toBeDefined();
      expect(screen.getByText("Arkusze ocen klasy")).toBeDefined();
      expect(screen.getByText("Świadectwa klasy")).toBeDefined();
      // Should NOT contain teacher only links
      expect(screen.queryByText("Moje przedmioty")).toBeNull();
    });
  });

  describe("AppHeader and Logout", () => {
    it("displays user information and school name", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: mockTeacherUser,
        isLoading: false,
        isAuthenticated: true,
        currentMembership: mockTeacherUser.memberships[0],
        currentSchoolId: "s-1",
        login: vi.fn(),
        logout: vi.fn(),
        switchSchool: vi.fn(),
        refreshUser: vi.fn(),
      });

      render(<AppHeader />);

      expect(screen.getByText("Jan Kowalski")).toBeDefined();
      expect(screen.getByText("Nauczyciel")).toBeDefined();
      expect(screen.getByText("Liceum Ogólnokształcące nr 1")).toBeDefined();
    });

    it("executes logout when logout button is clicked", async () => {
      const mockLogout = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useAuth).mockReturnValue({
        user: mockTeacherUser,
        isLoading: false,
        isAuthenticated: true,
        currentMembership: mockTeacherUser.memberships[0],
        currentSchoolId: "s-1",
        login: vi.fn(),
        logout: mockLogout,
        switchSchool: vi.fn(),
        refreshUser: vi.fn(),
      });

      render(<AppHeader />);

      const logoutBtn = screen.getByRole("button", { name: /wyloguj/i });
      fireEvent.click(logoutBtn);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
        expect(mockReplace).toHaveBeenCalledWith("/login");
      });
    });
  });

  describe("SchoolSelector", () => {
    it("displays dropdown when user has multiple active schools and switches on change", () => {
      const mockSwitchSchool = vi.fn();
      const multiSchoolUser: User = {
        ...mockTeacherUser,
        memberships: [
          mockTeacherUser.memberships[0],
          {
            id: "m-2",
            school: "s-2",
            school_name: "Szkoła Muzyczna",
            role: "teacher",
            role_display: "Nauczyciel",
            is_active: true,
          },
        ],
      };

      vi.mocked(useAuth).mockReturnValue({
        user: multiSchoolUser,
        isLoading: false,
        isAuthenticated: true,
        currentMembership: multiSchoolUser.memberships[0],
        currentSchoolId: "s-1",
        login: vi.fn(),
        logout: vi.fn(),
        switchSchool: mockSwitchSchool,
        refreshUser: vi.fn(),
      });

      render(<SchoolSelector />);

      const select = screen.getByLabelText(/wybierz szkołę/i);
      expect(select).toBeDefined();

      fireEvent.change(select, { target: { value: "s-2" } });
      expect(mockSwitchSchool).toHaveBeenCalledWith("s-2");
    });
  });

  describe("Breadcrumbs", () => {
    it("renders custom or dynamic breadcrumb trail", () => {
      currentPathname = "/students";
      render(<Breadcrumbs />);

      expect(screen.getByText("Pulpit")).toBeDefined();
      expect(screen.getByText("Księga uczniów")).toBeDefined();
    });
  });

  describe("Full AppLayout", () => {
    it("renders layout with sidebar, header and children content", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: mockTeacherUser,
        isLoading: false,
        isAuthenticated: true,
        currentMembership: mockTeacherUser.memberships[0],
        currentSchoolId: "s-1",
        login: vi.fn(),
        logout: vi.fn(),
        switchSchool: vi.fn(),
        refreshUser: vi.fn(),
      });

      render(
        <AppLayout>
          <div>Dashboard Content Area</div>
        </AppLayout>
      );

      expect(screen.getByText("Dashboard Content Area")).toBeDefined();
      expect(screen.getByText("Jan Kowalski")).toBeDefined();
      expect(screen.getByText("Widok Nauczyciela")).toBeDefined();
    });
  });
});

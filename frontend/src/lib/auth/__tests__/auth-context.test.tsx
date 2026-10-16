import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthProvider, useAuth } from "../auth-context";
import { api, ApiError } from "@/lib/api";
import type { User } from "../types";

vi.mock("@/lib/api", () => {
  class MockApiError extends Error {
    constructor(
      public status: number,
      public message: string,
      public code: string = "error",
      public fieldErrors?: Record<string, string[]>
    ) {
      super(message);
    }
    get isUnauthenticated(): boolean {
      return this.status === 401;
    }
  }

  return {
    api: {
      get: vi.fn(),
      post: vi.fn(),
    },
    ApiError: MockApiError,
  };
});

const mockUser: User = {
  id: "u-1",
  email: "teacher@szkola.pl",
  first_name: "Jan",
  last_name: "Kowalski",
  full_name: "Jan Kowalski",
  is_active: true,
  memberships: [
    {
      id: "m-1",
      school: "s-1",
      school_name: "Liceum Ogólnokształcące nr 1",
      role: "teacher",
      role_display: "Nauczyciel",
      is_active: true,
    },
    {
      id: "m-2",
      school: "s-2",
      school_name: "Technikum Elektroniczne",
      role: "homeroom_teacher",
      role_display: "Wychowawca",
      is_active: true,
    },
  ],
};

describe("AuthProvider and useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it("restores user session on mount via /api/auth/me/", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.currentSchoolId).toBe("s-1");
    expect(result.current.currentMembership?.role).toBe("teacher");
  });

  it("handles unauthenticated state gracefully when /api/auth/me/ returns 401", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new ApiError(401, "Brak sesji", "not_authenticated"));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.currentSchoolId).toBeNull();
  });

  it("logs in successfully and updates user state", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new ApiError(401, "Brak sesji", "not_authenticated"));
    vi.mocked(api.post).mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let loggedInUser: User | null = null;
    await act(async () => {
      loggedInUser = await result.current.login({
        email: "teacher@szkola.pl",
        password: "secretpassword",
      });
    });

    expect(api.post).toHaveBeenCalledWith("/api/auth/login/", {
      body: { email: "teacher@szkola.pl", password: "secretpassword" },
    });
    expect(loggedInUser).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.currentSchoolId).toBe("s-1");
  });

  it("logs out and clears user state and stored school", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockUser);
    vi.mocked(api.post).mockResolvedValueOnce({ detail: "Wylogowano pomyślnie." });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(api.post).toHaveBeenCalledWith("/api/auth/logout/");
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.currentSchoolId).toBeNull();
  });

  it("switches active school and updates currentMembership", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.currentSchoolId).toBe("s-1");
    });

    act(() => {
      result.current.switchSchool("s-2");
    });

    expect(result.current.currentSchoolId).toBe("s-2");
    expect(result.current.currentMembership?.role).toBe("homeroom_teacher");
    expect(result.current.currentMembership?.school_name).toBe("Technikum Elektroniczne");
  });

  it("throws error when useAuth is called outside AuthProvider", () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow("useAuth must be used within an AuthProvider");
  });
});

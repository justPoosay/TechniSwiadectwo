import { vi } from "vitest";
import type { ApiSchema } from "@/lib/api";
import type { AuthContextType } from "@/lib/auth";

export const SCHOOL_ID = "11111111-1111-4111-8111-111111111111";

export function authState(overrides: Partial<AuthContextType> = {}): AuthContextType {
  return {
    user: null,
    isLoading: false,
    isAuthenticated: true,
    currentMembership: null,
    currentSchoolId: SCHOOL_ID,
    login: vi.fn(),
    logout: vi.fn(),
    switchSchool: vi.fn(),
    refreshUser: vi.fn(),
    ...overrides,
  };
}

export function student(
  overrides: Partial<ApiSchema["StudentList"]> = {}
): ApiSchema["StudentList"] {
  return {
    id: "aaaaaaaa-0000-4000-8000-000000000001",
    first_name: "Jan",
    second_name: "Adam",
    last_name: "Kowalski",
    pesel: "08251412345",
    id_document_type: "",
    id_document_number: "",
    register_number: "12/2023",
    status: "ACTIVE",
    status_display: "Uczęszcza (Aktywny)",
    cohort: {
      id: "cccccccc-0000-4000-8000-000000000001",
      name: "3A",
      level: 3,
      academic_year_name: "2025/2026",
    },
    date_of_birth: "2008-05-14",
    created_at: "2025-09-01T08:00:00Z",
    updated_at: "2025-09-01T08:00:00Z",
    ...overrides,
  };
}

export function page<T>(results: T[], extra: { page?: number; total_pages?: number } = {}) {
  return {
    count: results.length,
    page: extra.page ?? 1,
    page_size: 25,
    total_pages: extra.total_pages ?? 1,
    results,
  };
}

type Route = (url: URL, init?: RequestInit) => Response;

/** Routes fetch() calls by pathname; every call gets a fresh Response. */
export function mockFetch(routes: Record<string, Route>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://localhost");
    const route = routes[url.pathname];
    if (!route) return Response.json({ code: "not_found", detail: "brak" }, { status: 404 });
    return route(url, init);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

export function requestsTo(fetchMock: ReturnType<typeof mockFetch>, pathname: string) {
  return fetchMock.mock.calls
    .map(([input, init]) => ({ url: new URL(String(input), "http://localhost"), init }))
    .filter(({ url }) => url.pathname === pathname);
}

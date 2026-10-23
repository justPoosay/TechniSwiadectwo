import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "@/lib/auth";
import { StudentsList } from "../students-list";
import { SCHOOL_ID, authState, mockFetch, page, requestsTo, student } from "./fixtures";

const replace = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/students",
  useSearchParams: () => searchParams,
}));

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));

const COHORTS = page([
  {
    id: "cccccccc-0000-4000-8000-000000000001",
    name: "3A",
    level: 3,
    academic_year: "y1",
    academic_year_name: "2025/2026",
  },
]);

function setup(students = page([student()])) {
  return mockFetch({
    "/api/students/": () => Response.json(students),
    "/api/cohorts/": () => Response.json(COHORTS),
  });
}

beforeEach(() => {
  replace.mockReset();
  searchParams = new URLSearchParams();
  vi.mocked(useAuth).mockReturnValue(authState());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("StudentsList", () => {
  it("shows students returned by the API", async () => {
    setup(
      page([
        student(),
        student({
          id: "aaaaaaaa-0000-4000-8000-000000000002",
          first_name: "Ewa",
          second_name: "",
          last_name: "Nowak",
          pesel: null,
          id_document_type: "PASSPORT",
          id_document_number: "XA1234567",
          register_number: "13/2023",
          status: "GRADUATED",
          cohort: null,
        }),
      ])
    );

    render(<StudentsList />);

    const link = await screen.findByRole("link", { name: "Kowalski Jan Adam" });
    expect(link.getAttribute("href")).toBe("/students/aaaaaaaa-0000-4000-8000-000000000001");
    const rows = screen.getAllByRole("row");
    expect(within(rows[1]).getByText("PESEL 08251412345")).toBeDefined();
    expect(within(rows[1]).getByText("3A (2025/2026)")).toBeDefined();
    expect(within(rows[1]).getByText("14.05.2008")).toBeDefined();
    expect(within(rows[2]).getByText("Paszport XA1234567")).toBeDefined();
    expect(within(rows[2]).getByText("Absolwent")).toBeDefined();
    expect(screen.getByText(/liczba uczniów/i).textContent).toContain("2");
  });

  it("requests the active school's first page", async () => {
    const fetchMock = setup();

    render(<StudentsList />);
    await screen.findByRole("link", { name: /kowalski/i });

    const [request] = requestsTo(fetchMock, "/api/students/");
    expect(request.url.searchParams.get("page")).toBe("1");
    expect(request.url.searchParams.get("page_size")).toBe("25");
    expect((request.init?.headers as Headers).get("X-School-ID")).toBe(SCHOOL_ID);
  });

  it("applies filters, ordering and page from the URL", async () => {
    searchParams = new URLSearchParams(
      "page=2&status=GRADUATED&cohort=cccccccc-0000-4000-8000-000000000001&ordering=-date_of_birth"
    );
    const fetchMock = setup(page([student()], { page: 2, total_pages: 3 }));

    render(<StudentsList />);
    await screen.findByText("Strona 2 z 3");

    const params = requestsTo(fetchMock, "/api/students/")[0].url.searchParams;
    expect(params.get("page")).toBe("2");
    expect(params.get("status")).toBe("GRADUATED");
    expect(params.get("cohort")).toBe("cccccccc-0000-4000-8000-000000000001");
    expect(params.get("ordering")).toBe("-date_of_birth");
  });

  it("ignores invalid URL values", async () => {
    searchParams = new URLSearchParams("page=abc&status=HACKED&ordering=password");
    const fetchMock = setup();

    render(<StudentsList />);
    await screen.findByRole("link", { name: /kowalski/i });

    const params = requestsTo(fetchMock, "/api/students/")[0].url.searchParams;
    expect(params.get("page")).toBe("1");
    expect(params.has("status")).toBe(false);
    expect(params.has("ordering")).toBe(false);
  });

  it("puts filters in the URL and resets the page", async () => {
    searchParams = new URLSearchParams("page=3");
    setup();
    render(<StudentsList />);
    await screen.findByRole("option", { name: "3A (2025/2026)" });

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "WITHDRAWN" } });
    expect(replace).toHaveBeenLastCalledWith("/students?status=WITHDRAWN", { scroll: false });

    fireEvent.change(screen.getByLabelText("Klasa"), {
      target: { value: "cccccccc-0000-4000-8000-000000000001" },
    });
    expect(replace).toHaveBeenLastCalledWith(
      "/students?cohort=cccccccc-0000-4000-8000-000000000001",
      { scroll: false }
    );
  });

  it("toggles sorting when a column header is clicked", async () => {
    setup();
    render(<StudentsList />);
    await screen.findByRole("link", { name: /kowalski/i });

    const header = screen.getByRole("columnheader", { name: /uczeń/i });
    expect(header.getAttribute("aria-sort")).toBe("ascending");
    fireEvent.click(within(header).getByRole("button"));
    expect(replace).toHaveBeenLastCalledWith("/students?ordering=-last_name", { scroll: false });

    fireEvent.click(screen.getByRole("button", { name: /nr w księdze/i }));
    expect(replace).toHaveBeenLastCalledWith("/students?ordering=register_number", {
      scroll: false,
    });
  });

  it("paginates", async () => {
    searchParams = new URLSearchParams("page=2");
    setup(page([student()], { page: 2, total_pages: 3 }));
    render(<StudentsList />);
    await screen.findByText("Strona 2 z 3");

    fireEvent.click(screen.getByRole("button", { name: "Następna" }));
    expect(replace).toHaveBeenLastCalledWith("/students?page=3", { scroll: false });
    fireEvent.click(screen.getByRole("button", { name: "Poprzednia" }));
    expect(replace).toHaveBeenLastCalledWith("/students?page=1", { scroll: false });
  });

  it("searches after typing stops, without putting the text in the URL", async () => {
    const fetchMock = setup();
    render(<StudentsList />);
    await screen.findByRole("link", { name: /kowalski/i });

    fireEvent.change(screen.getByLabelText("Szukaj ucznia"), { target: { value: "Kowal" } });

    await waitFor(() =>
      expect(
        requestsTo(fetchMock, "/api/students/").some(
          ({ url }) => url.searchParams.get("search") === "Kowal"
        )
      ).toBe(true)
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("explains an empty register", async () => {
    setup(page([]));
    render(<StudentsList />);

    expect(await screen.findByText("Brak zarejestrowanych uczniów")).toBeDefined();
  });

  it("offers to clear filters when nothing matches", async () => {
    searchParams = new URLSearchParams("status=WITHDRAWN");
    setup(page([]));
    render(<StudentsList />);

    expect(await screen.findByText("Brak wyników")).toBeDefined();
    fireEvent.click(screen.getAllByRole("button", { name: "Wyczyść filtry" })[0]);
    expect(replace).toHaveBeenLastCalledWith("/students", { scroll: false });
  });

  it("shows an error with retry", async () => {
    let calls = 0;
    mockFetch({
      "/api/students/": () =>
        ++calls === 1
          ? Response.json({ code: "server_error", detail: "Błąd serwera." }, { status: 500 })
          : Response.json(page([student()])),
      "/api/cohorts/": () => Response.json(COHORTS),
    });
    render(<StudentsList />);

    expect(await screen.findByText("Nie udało się pobrać listy uczniów")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));
    expect(await screen.findByRole("link", { name: /kowalski/i })).toBeDefined();
  });

  it("shows missing permissions without a retry button", async () => {
    mockFetch({
      "/api/students/": () =>
        Response.json({ code: "permission_denied", detail: "Brak uprawnień." }, { status: 403 }),
      "/api/cohorts/": () => Response.json(COHORTS),
    });
    render(<StudentsList />);

    expect(await screen.findByText("Brak dostępu do danych uczniów")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Spróbuj ponownie" })).toBeNull();
  });

  it("does not call the API without an active school", () => {
    vi.mocked(useAuth).mockReturnValue(authState({ currentSchoolId: null }));
    const fetchMock = setup();

    render(<StudentsList />);

    expect(screen.getByText("Nie wybrano szkoły")).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

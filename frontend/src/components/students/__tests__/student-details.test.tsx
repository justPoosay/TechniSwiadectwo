import React from "react";
import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiSchema } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { StudentDetailsContent } from "../student-details";
import { SCHOOL_ID, authState, mockFetch, requestsTo, student } from "./fixtures";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));

const STUDENT_ID = "aaaaaaaa-0000-4000-8000-000000000001";
const DETAIL_PATH = `/api/students/${STUDENT_ID}/`;

function detail(overrides: Partial<ApiSchema["StudentDetail"]> = {}): ApiSchema["StudentDetail"] {
  return {
    ...student(),
    place_of_birth: "Radom",
    history_entries: [
      {
        id: "h2",
        event_type: "PROMOTION",
        event_type_display: "Promocja do następnej klasy",
        event_date: "2025-06-27",
        academic_year_name: "2024/2025",
        source_cohort_name: "2A",
        target_cohort_name: "3A",
        document_number: "Uchwała RP 12/2025",
        notes: "",
        created_at: "2025-06-27T10:00:00Z",
      },
      {
        id: "h1",
        event_type: "ADMISSION",
        event_type_display: "Przyjęcie do szkoły",
        event_date: "2023-09-01",
        academic_year_name: "2023/2024",
        source_cohort_name: null,
        target_cohort_name: "1A",
        document_number: "",
        notes: "Przyjęty z rekrutacji",
        created_at: "2023-09-01T10:00:00Z",
      },
    ],
    data_corrections: [
      {
        id: "c1",
        author_email: "sekretariat@szkola.pl",
        reason: "Błąd pisarski w nazwisku",
        changed_fields: {
          last_name: { old: "Kowlaski", new: "Kowalski" },
          date_of_birth: { old: "2008-05-15", new: "2008-05-14" },
        },
        created_at: "2025-10-01T12:30:00Z",
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue(authState());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("StudentDetailsContent", () => {
  it("loads the student from the active school", async () => {
    const fetchMock = mockFetch({ [DETAIL_PATH]: () => Response.json(detail()) });

    render(<StudentDetailsContent studentId={STUDENT_ID} />);

    expect(await screen.findByRole("heading", { name: "Jan Adam Kowalski" })).toBeDefined();
    const [request] = requestsTo(fetchMock, DETAIL_PATH);
    expect((request.init?.headers as Headers).get("X-School-ID")).toBe(SCHOOL_ID);
  });

  it("shows personal data and the current class", async () => {
    mockFetch({ [DETAIL_PATH]: () => Response.json(detail()) });
    render(<StudentDetailsContent studentId={STUDENT_ID} />);

    const data = await screen.findByRole("region", { name: "Dane ucznia" });
    expect(within(data).getByText("08251412345")).toBeDefined();
    expect(within(data).getByText("14.05.2008")).toBeDefined();
    expect(within(data).getByText("Radom")).toBeDefined();
    const cohort = screen.getByRole("region", { name: "Klasa" });
    expect(within(cohort).getByText("3A")).toBeDefined();
    expect(within(cohort).getByText("2025/2026")).toBeDefined();
  });

  it("shows a substitute document when there is no PESEL", async () => {
    mockFetch({
      [DETAIL_PATH]: () =>
        Response.json(
          detail({ pesel: null, id_document_type: "PASSPORT", id_document_number: "XA1234567" })
        ),
    });
    render(<StudentDetailsContent studentId={STUDENT_ID} />);

    const data = await screen.findByRole("region", { name: "Dane ucznia" });
    expect(within(data).getByText("Dokument tożsamości (brak PESEL)")).toBeDefined();
    expect(within(data).getByText("Paszport XA1234567")).toBeDefined();
  });

  it("shows the learning history in order", async () => {
    mockFetch({ [DETAIL_PATH]: () => Response.json(detail()) });
    render(<StudentDetailsContent studentId={STUDENT_ID} />);

    const history = await screen.findByRole("region", { name: "Historia przebiegu nauki" });
    const items = within(history).getAllByRole("listitem");
    expect(items[0].textContent).toContain("Promocja do następnej klasy");
    expect(items[0].textContent).toContain("27.06.2025");
    expect(items[0].textContent).toContain("2A → 3A");
    expect(items[0].textContent).toContain("Uchwała RP 12/2025");
    expect(items[1].textContent).toContain("Przyjęcie do szkoły");
    expect(items[1].textContent).toContain("— → 1A");
  });

  it("shows corrections with previous and new values", async () => {
    mockFetch({ [DETAIL_PATH]: () => Response.json(detail()) });
    render(<StudentDetailsContent studentId={STUDENT_ID} />);

    const corrections = await screen.findByRole("region", { name: "Historia zmian danych" });
    expect(within(corrections).getByText("Błąd pisarski w nazwisku")).toBeDefined();
    expect(within(corrections).getByText(/sekretariat@szkola\.pl/)).toBeDefined();
    const nameRow = within(corrections).getByText("Nazwisko").closest("tr")!;
    expect(within(nameRow).getByText("Kowlaski")).toBeDefined();
    expect(within(nameRow).getByText("Kowalski")).toBeDefined();
    const dateRow = within(corrections).getByText("Data urodzenia").closest("tr")!;
    expect(within(dateRow).getByText("15.05.2008")).toBeDefined();
  });

  it("explains empty histories", async () => {
    mockFetch({
      [DETAIL_PATH]: () => Response.json(detail({ history_entries: [], data_corrections: [] })),
    });
    render(<StudentDetailsContent studentId={STUDENT_ID} />);

    expect(await screen.findByText("Brak wpisów w historii przebiegu nauki.")).toBeDefined();
    expect(screen.getByText("Dane ucznia nie były dotąd korygowane.")).toBeDefined();
  });

  it("shows not found for a student from another school", async () => {
    mockFetch({
      [DETAIL_PATH]: () =>
        Response.json({ code: "not_found", detail: "Nie znaleziono." }, { status: 404 }),
    });
    render(<StudentDetailsContent studentId={STUDENT_ID} />);

    expect(await screen.findByText("Nie znaleziono ucznia")).toBeDefined();
    expect(screen.getByRole("link", { name: /wróć do listy/i }).getAttribute("href")).toBe(
      "/students"
    );
  });
});

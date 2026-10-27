import { expect, type Page } from "@playwright/test";

// Must match backend/apps/core/management/commands/seed_e2e.py.
export const PASSWORD = process.env.E2E_PASSWORD ?? "e2e-Haslo-Testowe-1";
export const FOREIGN_STUDENT_ID = "e2e00000-0000-4000-8000-0000000000b1";

export type Role = "secretariat" | "teacher" | "homeroom_teacher" | "principal" | "admin";

export const ACCOUNTS: Record<Role, { email: string; roleLabel: string; fullName: string }> = {
  secretariat: {
    email: "e2e-sekretariat@szkola-a.test",
    roleLabel: "Sekretariat",
    fullName: "Sylwia Sekretarska",
  },
  teacher: {
    email: "e2e-nauczyciel@szkola-a.test",
    roleLabel: "Nauczyciel",
    fullName: "Norbert Nauczycielski",
  },
  homeroom_teacher: {
    email: "e2e-wychowawca@szkola-a.test",
    roleLabel: "Wychowawca",
    fullName: "Wanda Wychowawczyni",
  },
  principal: {
    email: "e2e-dyrekcja@szkola-a.test",
    roleLabel: "Dyrekcja",
    fullName: "Damian Dyrektorski",
  },
  admin: {
    email: "e2e-admin@szkola-a.test",
    roleLabel: "Administrator",
    fullName: "Adam Administracyjny",
  },
};

export async function login(page: Page, role: Role, next = "/") {
  await page.goto(next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Adres e-mail").fill(ACCOUNTS[role].email);
  await page.getByLabel("Hasło", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Zaloguj się" }).click();
  // Generous timeout: `next dev` compiles routes on first use.
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
}

import { expect, test } from "@playwright/test";
import { ACCOUNTS, FOREIGN_STUDENT_ID, PASSWORD, login, type Role } from "./fixtures";

// T28: authentication, roles, session loss and school isolation, end to end
// (browser -> Next.js proxy -> Django). Data: `python manage.py seed_e2e`.

test.describe("logowanie", () => {
  test("niezalogowany użytkownik trafia na logowanie i wraca na żądaną stronę", async ({
    page,
  }) => {
    await page.goto("/students");
    await expect(page).toHaveURL(/\/login\?next=%2Fstudents/);

    await page.getByLabel("Adres e-mail").fill(ACCOUNTS.secretariat.email);
    await page.getByLabel("Hasło", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Zaloguj się" }).click();

    await expect(page).toHaveURL(/\/students$/);
    await expect(page.getByRole("heading", { name: "Księga uczniów" })).toBeVisible();
  });

  test("błędne hasło pokazuje komunikat i nie tworzy sesji", async ({ page, context }) => {
    await page.goto("/login");
    await page.getByLabel("Adres e-mail").fill(ACCOUNTS.secretariat.email);
    await page.getByLabel("Hasło", { exact: true }).fill("zle-haslo");
    await page.getByRole("button", { name: "Zaloguj się" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "Nieprawidłowy adres e-mail lub hasło" })
    ).toBeVisible();
    const cookies = await context.cookies();
    expect(cookies.find((cookie) => cookie.name === "sessionid")).toBeUndefined();
  });

  test("ciasteczko sesji jest niedostępne dla JavaScriptu", async ({ page, context }) => {
    await login(page, "secretariat");

    const session = (await context.cookies()).find((cookie) => cookie.name === "sessionid");
    expect(session?.httpOnly).toBe(true);
    expect(await page.evaluate(() => document.cookie)).not.toContain("sessionid");
  });
});

const STUDENTS_ALLOWED: Record<Role, boolean> = {
  secretariat: true,
  teacher: false,
  homeroom_teacher: false,
  principal: true,
  admin: true,
};

test.describe("role", () => {
  for (const [role, allowed] of Object.entries(STUDENTS_ALLOWED) as [Role, boolean][]) {
    test(`${ACCOUNTS[role].roleLabel}: ${allowed ? "widzi" : "nie widzi"} księgi uczniów`, async ({
      page,
    }) => {
      await login(page, role);
      await expect(page.getByText(ACCOUNTS[role].roleLabel).first()).toBeVisible();

      const menu = page.getByRole("complementary").getByRole("link", { name: "Księga uczniów" });
      if (allowed) {
        await expect(menu).toBeVisible();
      } else {
        await expect(menu).toHaveCount(0);
      }

      // Opening the URL directly must not bypass the role check.
      await page.goto("/students");
      if (allowed) {
        await expect(page.getByRole("cell", { name: "Jan Testowy" })).toBeVisible();
      } else {
        await expect(page.getByText("Brak uprawnień (403)")).toBeVisible();
        await expect(page.getByRole("table")).toHaveCount(0);
      }
    });
  }

  test("API odrzuca rolę bez uprawnień nawet z pominięciem interfejsu", async ({ page }) => {
    await login(page, "teacher");
    const schoolId = await page.evaluate(async () => {
      const me = await fetch("/api/auth/me/").then((response) => response.json());
      return me.memberships[0].school as string;
    });

    const status = await page.evaluate(
      (id) => fetch("/api/students/", { headers: { "X-School-ID": id } }).then((r) => r.status),
      schoolId
    );

    expect(status).toBe(403);
  });
});

test.describe("sesja", () => {
  test("wylogowanie kończy sesję", async ({ page }) => {
    await login(page, "principal", "/students");

    await page.getByRole("button", { name: "Wyloguj się" }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/students");
    await expect(page).toHaveURL(/\/login\?next=%2Fstudents/);
  });

  test("utrata sesji (wygaśnięcie) przekierowuje do logowania", async ({ page, context }) => {
    await login(page, "secretariat", "/students");
    await expect(page.getByRole("cell", { name: "Jan Testowy" })).toBeVisible();

    // The browser drops the cookie when the session expires (Max-Age).
    await context.clearCookies({ name: "sessionid" });
    await page.reload();

    await expect(page).toHaveURL(/\/login\?next=%2Fstudents/);
  });
});

test.describe("izolacja szkół", () => {
  test("lista nie zawiera uczniów innej szkoły", async ({ page }) => {
    await login(page, "admin", "/students");

    await expect(page.getByRole("cell", { name: "Jan Testowy" })).toBeVisible();
    await expect(page.getByText("Obcy")).toHaveCount(0);
  });

  test("uczeń innej szkoły nie jest dostępny pod bezpośrednim adresem", async ({ page }) => {
    await login(page, "admin");

    await page.goto(`/students/${FOREIGN_STUDENT_ID}`);

    // The API answers 404, so the page shows "not found" and none of the data.
    await expect(page.getByText(/Nie znaleziono/)).toBeVisible();
    await expect(page.getByText("Obcy")).toHaveCount(0);
  });

  test("API odrzuca nagłówek szkoły, do której użytkownik nie należy", async ({ page }) => {
    await login(page, "admin");

    const status = await page.evaluate(() =>
      fetch("/api/students/", {
        headers: { "X-School-ID": "e2e00000-0000-4000-8000-00000000000b" },
      }).then((response) => response.status)
    );

    expect(status).toBe(403);
  });
});

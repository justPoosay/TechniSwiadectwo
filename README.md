# TechniŚwiadectwo

TechniŚwiadectwo to moduł demonstracyjny służący do przygotowywania dokumentacji szkolnej na podstawie danych uczniów. Projekt ma ograniczyć ręczne przepisywanie informacji i zmniejszyć ryzyko błędów podczas prowadzenia księgi uczniów, arkuszy ocen oraz wystawiania świadectw.

## Zakres projektu

Planowana wersja POC umożliwi:

- import fikcyjnych danych uczniów z plików CSV lub JSON;
- sprawdzanie kompletności i poprawności danych;
- weryfikowanie i zatwierdzanie danych przez uprawnionych użytkowników;
- prowadzenie księgi uczniów z historią zmian;
- prowadzenie wieloletnich arkuszy ocen;
- zapisywanie ocen, wyników egzaminów i decyzji klasyfikacyjnych;
- generowanie świadectw i arkuszy ocen w formacie PDF;
- zbiorcze generowanie dokumentów dla klasy lub wybranej grupy uczniów;
- rejestrowanie zmian, zatwierdzeń i operacji na dokumentach;
- rozdzielenie dostępu według szkoły i roli użytkownika.

Projekt wykorzystuje wyłącznie dane fikcyjne. Wersja POC obsłuży jeden wybrany typ szkoły i jeden uzgodniony wzór świadectwa. Przed użyciem produkcyjnym wymagane będą dodatkowa weryfikacja formalna, analiza bezpieczeństwa oraz integracja z systemem Techni Zdalni.

## Technologie

### Backend
- Python 3.13;
- Django 5.2;
- Django REST Framework 3.16;
- PostgreSQL 16.

### Frontend
- Next.js 16 (App Router);
- React 19;
- TypeScript 5;
- Tailwind CSS 4.

### Jakość i infrastruktura
- Docker & Docker Compose;
- Ruff (linter i formatowanie dla Pythona);
- Mypy & django-stubs (kontrola typów w Pythonie);
- Pytest & pytest-django (testy backendu);
- Prettier & ESLint (formatowanie i lintowanie TypeScript);
- Vitest & React Testing Library (testy frontendu);
- GitHub Actions CI Pipeline (`.github/workflows/ci.yml`).

## Struktura repozytorium

```text
backend/    Aplikacja Django i REST API
frontend/   Aplikacja Next.js
infra/      Konfiguracja kontenerowa Docker Compose
docs/       Dokumentacja techniczna i decyzje architektoniczne
scripts/    Skrypty deweloperskie (np. check-quality.ps1)
```

---

## Przewodnik po lokalnym uruchomieniu (od A do Z)

Poniższa instrukcja prowadzi krok po kroku od pierwszego sklonowania repozytorium do w pełni działającej aplikacji oraz przechodzących testów na lokalnym komputerze.

### 1. Wymagane oprogramowanie

Przed rozpoczęciem upewnij się, że masz zainstalowane:

- **Git** (`git --version`)
- **Python 3.13** lub 3.12 (`python --version`)
- **Node.js 20+** oraz `npm` (`node --version`, `npm --version`)
- **Docker Desktop** / Docker Compose (zalecane do uruchomienia całości jednym poleceniem)
- *Opcjonalnie*: PostgreSQL 16 zainstalowany lokalnie (jeśli uruchamiasz backend bez Dockera).

---

### 2. Sklonowanie repozytorium i przygotowanie zmiennych środowiskowych

#### 2.1 Sklonowanie repozytorium:

```bash
git clone <adres-repozytorium>
cd TechniSwiadectwo
```

#### 2.2 Przygotowanie plików środowiskowych `.env`:

W repozytorium dostarczone są wzorcowe pliki konfiguracyjne `.env.example` oraz `.example.env`. Pliki `.env` zawierają lokalne sekrety i nie są dodawane do systemu Git.

W systemie Windows (PowerShell):
```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.example.env frontend\.env
```

W systemie Linux / macOS (Bash):
```bash
cp backend/.env.example backend/.env
cp frontend/.example.env frontend/.env
```

---

### Sposób A: Uruchomienie za pomocą Docker Compose (Najszybsze / Zalecane)

Ta metoda uruchamia bazę danych PostgreSQL, backend Django oraz frontend Next.js w odizolowanych kontenerach za pomocą jednego polecenia.

1. **Uruchomienie kontenerów**:

   Wykonaj z głównego katalogu repozytorium:
   ```bash
   docker-compose -f infra/docker-compose.yml up --build
   ```

2. **Dostęp do serwisów**:
   - **Frontend (Next.js)**: `http://localhost:3000/`
   - **Backend API Health Check**: `http://localhost:8000/api/health/`
   - **Panel administracyjny Django**: `http://localhost:8000/admin/`

3. **Zatrzymanie kontenerów**:
   Naciśnij `Ctrl+C` lub wykonaj w osobnym terminalu:
   ```bash
   docker-compose -f infra/docker-compose.yml down
   ```

---

### Sposób B: Uruchomienie lokalne (Bez kontenerów)

Jeśli wolisz uruchomić backend i frontend bezpośrednio na swoim systemie operacyjnym:

#### Krok 1: Konfiguracja i uruchomienie Backendu (Django)

1. Przejdź do katalogu backendu:
   ```bash
   cd backend
   ```

2. Utwórz środowisko wirtualne Python (katalog `.venv` lub `venv`):
   - PowerShell:
     ```powershell
     python -m venv .venv
     ```
   - Bash:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. Zainstaluj zależności deweloperskie:
   - PowerShell:
     ```powershell
     .\.venv\Scripts\python.exe -m pip install -r requirements\dev.txt
     ```
   - Bash / Linux:
     ```bash
     pip install -r requirements/dev.txt
     ```

4. Przygotuj bazę danych PostgreSQL:
   - Połącz się z lokalnym serwerem PostgreSQL i utwórz bazę oraz użytkownika (dane z pliku `.env`):
     ```sql
     CREATE USER techniswiadectwo WITH PASSWORD 'lokalne-haslo';
     CREATE DATABASE techniswiadectwo OWNER techniswiadectwo;
     ```
   - Ustaw zmienne środowiskowe połączenia w bieżącej sesji terminala lub upewnij się, że plik `.env` posiada poprawne wartości:
     - `POSTGRES_DB=techniswiadectwo`
     - `POSTGRES_USER=techniswiadectwo`
     - `POSTGRES_PASSWORD=lokalne-haslo`
     - `POSTGRES_HOST=localhost`
     - `POSTGRES_PORT=5432`

5. Wykonaj migracje bazy danych:
   - PowerShell:
     ```powershell
     .\.venv\Scripts\python.exe manage.py migrate
     ```
   - Bash:
     ```bash
     python manage.py migrate
     ```

6. Uruchom serwer deweloperski backendu:
   - PowerShell:
     ```powershell
     .\.venv\Scripts\python.exe manage.py runserver
     ```
   - Bash:
     ```bash
     python manage.py runserver
     ```
   Serwer wystartuje pod adresem `http://127.0.0.1:8000/`.

---

#### Krok 2: Konfiguracja i uruchomienie Frontendu (Next.js)

1. Otwórz nowe okno terminala i przejdź do katalogu frontendu:
   ```bash
   cd frontend
   ```

2. Zainstaluj zależności npm:
   ```bash
   npm install
   ```

3. Uruchom serwer deweloperski Next.js:
   ```bash
   npm run dev
   ```
   Aplikacja wystartuje pod adresem `http://localhost:3000/`.

---

## Testy i kontrola jakości kodu

W projekcie skonfigurowano kompletny zestaw narzędzi do weryfikacji jakości kodu.

### 1. Zbiorcze uruchomienie wszystkich sprawdzianów (Wspólne polecenia)

Z katalogu głównego projektu można uruchomić pełen zestaw testów, lintowania, kontroli typów i formatowania:

- **PowerShell (Windows)**:
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\scripts\check-quality.ps1
  ```
- **NPM (Cross-platform)**:
  ```bash
  npm run check-all
  ```

### 2. Szczegółowe polecenia dla pojedynczych obszarów

| Obszar | Formatowanie | Lintowanie | Kontrola typów | Testy jednostkowe | Build produkcyjny |
|---|---|---|---|---|---|
| **Backend** | `ruff format backend` | `ruff check backend` | `mypy backend` | `pytest backend` | N/A |
| **Frontend** | `npm run format --prefix frontend` | `npm run lint --prefix frontend` | `npm run type-check --prefix frontend` | `npm run test --prefix frontend` | `npm run build --prefix frontend` |

---

## Continuous Integration (CI / CD)

Każda zmiana wysłana na gałęzie `main`, `master` lub `develop` (oraz w ramach Pull Requestów) automatycznie uruchamia potok CI w **GitHub Actions** (`.github/workflows/ci.yml`), który wykonuje:
1. Budowanie bazy PostgreSQL 16 i wykonywanie wszystkich migracji od zera (`manage.py migrate`).
2. Sprawdzanie nieutworzonych migracji (`manage.py makemigrations --check --dry-run`).
3. Formatowanie i lintowanie kodu (Ruff, ESLint, Prettier).
4. Kontrolę typów (Mypy, TypeScript `tsc --noEmit`).
5. Uruchomienie testów jednostkowych (Pytest, Vitest).
6. Produkcyjny build Next.js (`npm run build`).

---

## Najczęstsze problemy (Troubleshooting)

### 1. Błąd połączenia z PostgreSQL (`connection refused` / `password authentication failed`)
- Upewnij się, że usługa PostgreSQL działa i nasłuchuje na porcie `5432`.
- Sprawdź, czy nazwa bazy, użytkownik i hasło w pliku `backend/.env` zgadzają się z ustawieniami PostgreSQL.

### 2. Problem z importami `rest_framework` w Mypy
- Upewnij się, że zainstalowano najnowsze dev-dependencies:
  `pip install -r backend/requirements/dev.txt` (pakiet `djangorestframework-stubs`).

### 3. `TS2304: Cannot find name 'LayoutProps'` we Frontendzie
- Używaj standardowego typowania React dla komponentu layoutu: `{ children }: Readonly<{ children: React.ReactNode }>`.

---

## Status projektu

Struktura repozytorium, backend Django, frontend Next.js, środowisko kontenerowe Docker Compose, narzędzia jakości kodu oraz potok CI GitHub Actions i pełna dokumentacja lokalnego uruchomienia zostały skonfigurowane i zweryfikowane.

---

## Licencja

Warunki wykorzystania projektu nie zostały jeszcze określone.

---

## Zrobione

### T21. Zaimplementować logowanie i wylogowanie

### T22. Skonfigurować komunikację Next.js–Django

Przeglądarka rozmawia wyłącznie z Next.js (ten sam origin). Każde żądanie `/api/*` jest przekazywane do Django przez route handler `frontend/src/app/api/[...path]/route.ts` (logika w `frontend/src/lib/api/proxy.ts`):

```text
przeglądarka ──/api/auth/me/──▶ Next.js :3000 ──BACKEND_URL/api/auth/me/──▶ Django :8000
```

- Adres Django ustawia zmienna **`BACKEND_URL`** (tylko po stronie serwera, nie trafia do przeglądarki): `http://localhost:8000` lokalnie, `http://backend:8000` w Docker Compose.
- Proxy przekazuje tylko potrzebne nagłówki (cookie, `X-CSRFToken`, `X-School-ID`, `Origin`, `Referer`…), każde `Set-Cookie` osobno, usuwa `WWW-Authenticate` i nie ujawnia wewnętrznego adresu backendu w przekierowaniach. Gdy Django nie odpowiada, zwraca JSON `{"detail", "code"}` ze statusem 502 (`backend_unavailable`) albo 504 (`backend_timeout`).
- `skipTrailingSlashRedirect` w `next.config.ts` zachowuje końcowy `/` wymagany przez URL-e Django.
- Sesja: cookie `sessionid` jest `HttpOnly` + `SameSite=Lax`. Żadne tokeny ani dane osobowe nie są zapisywane w `localStorage`.
- CSRF: `GET /api/auth/csrf/` ustawia cookie `csrftoken`, a klient odsyła je w nagłówku `X-CSRFToken` przy każdym żądaniu zmieniającym dane (także przy logowaniu).
- Niezalogowany użytkownik dostaje **401**, zalogowany bez uprawnień **403**. Domyślnie każdy endpoint wymaga zalogowania (`IsAuthenticated`).

Klient API dla komponentów jest opisany w T23 (typowany na podstawie OpenAPI).

Zmienne Django: `DJANGO_ALLOWED_HOSTS` musi zawierać `backend` (host używany przez proxy w Dockerze), a `DJANGO_CSRF_TRUSTED_ORIGINS` adres frontendu (`http://localhost:3000`).

### T23. Opublikować kontrakt OpenAPI

Kontrakt API jest generowany z kodu Django przez [drf-spectacular](https://drf-spectacular.readthedocs.io/) i zapisany w repozytorium: **[`docs/api/openapi.yaml`](docs/api/openapi.yaml)**. Na jego podstawie powstają typy TypeScript dla Next.js (`frontend/src/lib/api/schema.ts`, [openapi-typescript](https://openapi-ts.dev/)).

Dokumentacja na żywo (po uruchomieniu aplikacji, także przez proxy na `:3000`):

| Adres | Co to jest |
| --- | --- |
| `/api/docs/` | Swagger UI: endpointy, parametry, przykładowe odpowiedzi, „Try it out” |
| `/api/redoc/` | ReDoc: ta sama dokumentacja w formie do czytania |
| `/api/schema/` | Schemat OpenAPI 3 (YAML, albo JSON z `Accept: application/json`) |

Opis uwierzytelniania, nagłówka szkoły, paginacji i błędów znajduje się na początku dokumentacji (`backend/config/openapi_description.md`).

**Ujednolicone konwencje API:**

- **Błędy**: każdy błąd ma kształt `{"code", "detail", "field_errors?"}` (`ErrorResponse`), np. `validation_error`, `not_authenticated`, `permission_denied`, `csrf_failed`, `not_found`, `server_error`. Dotyczy też błędów spoza DRF (CSRF, nieznany URL `/api/...`, błąd 500).
- **Paginacja**: `?page=&page_size=` (domyślnie 25, maks. 100) → `{"count", "page", "page_size", "total_pages", "results"}`. Bez absolutnych linków `next`/`previous`, które za proxy wskazywałyby wewnętrzny adres backendu.
- **Filtrowanie**: `django-filter` + `?search=` + `?ordering=` (dozwolone wartości są enumem w schemacie).
- **Szkoła**: endpointy danych szkoły wymagają nagłówka `X-School-ID` (opisany w schemacie jako wymagany).

**Typowany klient** (`frontend/src/lib/api`) sprawdza ścieżki, parametry, body i odpowiedzi względem kontraktu w czasie kompilacji:

```ts
import { api, ApiError, type ApiSchema } from "@/lib/api";

const user = await api.get("/api/auth/me/");                // user: ApiSchema["User"]
await api.post("/api/auth/login/", { body: { email, password } });
const page = await api.get("/api/audit-logs/", {
  schoolId,                                                  // wymagane przez X-School-ID
  query: { action: "login", ordering: "-created_at", page: 2 },
});
const log = await api.get("/api/audit-logs/{id}/", { schoolId, path: { id } });

try {
  await api.post("/api/auth/login/", { body: { email, password } });
} catch (error) {
  if (error instanceof ApiError) {
    error.code;              // np. "validation_error"
    error.message;           // komunikat do wyświetlenia
    error.fieldErrors;       // { email: ["..."] } dla formularzy
    error.isUnauthenticated; // 401 → przekierowanie do logowania
  }
}
```

Nieistniejąca ścieżka, brak `schoolId`, zła wartość `ordering` albo brak wymaganego pola w `body` to błąd `npm run type-check`.

**Po zmianie API** (nowy endpoint, pole, filtr) wygeneruj kontrakt i typy z głównego katalogu (aktywne venv backendu):

```bash
npm run api:generate
```

i zacommituj `docs/api/openapi.yaml` oraz `frontend/src/lib/api/schema.ts`. CI pilnuje, żeby nie były nieaktualne: pytest porównuje schemat z kodem (`test_committed_schema_is_up_to_date`), a job frontendu uruchamia `npm run api:types:check`.

### T24. Zbudować logowanie w Next.js

Wdrożono kompletny mechanizm logowania i zarządzania sesją użytkownika:

- **Formularz logowania (`/login`)**:
  - Walidacja formularza po stronie klienta (e-mail, hasło) oraz prezentacja błędów pól (`field_errors`) i błędów ogólnych zwracanych przez API Django (`ErrorResponse`).
  - Przełącznik widoczności hasła oraz stan wysyłania (spinner, blokada ponownego kliknięcia).
- **Zarządzanie sesją (`AuthProvider`, `useAuth`)**:
  - Automatyczne przywracanie sesji na starcie aplikacji (`GET /api/auth/me/`).
  - Aktywna szkoła (`currentSchoolId`) oraz rola użytkownika (`currentMembership`).
  - Funkcja wylogowania (`POST /api/auth/logout/`) czyszcząca stan sesji i przekierowująca do formularza logowania.
- **Przekierowania**:
  - Komponent `ProtectedRoute` automatycznie przekierowuje niezalogowanych użytkowników do `/login?next=<ścieżka>`.
  - Po poprawnym zalogowaniu użytkownik wraca do żądanej strony (lub na pulpit `/`).
  - Użytkownik zalogowany odwiedzający `/login` jest przekierowywany na pulpit.

### T25. Zbudować szkielet chronionej aplikacji

Wdrożono szkielet interfejsu chronionego (`AppLayout`) dostosowany do roli użytkownika:

- **Menu zależne od roli (`AppSidebar`)**:
  - **Nauczyciel (`teacher`)**: widok przedmiotów lekcyjnych (`/subjects`) oraz ocen cząstkowych (`/grades`).
  - **Wychowawca (`homeroom_teacher`)**: widok powierzonej klasy (`/my-class`), arkuszy ocen klasy (`/grade-sheets`) oraz świadectw (`/certificates`).
  - **Sekretariat (`secretariat`)**: księga uczniów (`/students`) oraz wydawanie świadectw (`/certificates`).
  - **Dyrekcja (`principal`)**: zatwierdzenia dokumentów (`/approvals`), księga uczniów, świadectwa i dziennik audytu (`/audit`).
  - **Administrator (`admin`)**: zarządzanie użytkownikami, dziennik audytu i ustawienia szkoły.
- **Pasek górny (`AppHeader`)**:
  - Nazwa i logo systemu.
  - Wybór aktywnej szkoły (`SchoolSelector`) dla użytkowników o wielu przypisaniach.
  - Dane użytkownika wraz z etykietą i kolorystyczną odznaką roli.
  - Przycisk wylogowania z obsługą stanu ładowania.
- **Ścieżka powrotu (`Breadcrumbs`)**:
  - Dynamiczne generowanie okruszków nawigacyjnych na podstawie aktualnej trasy URL.
- **Komponenty stanów aplikacji (`frontend/src/components/ui/states/`)**:
  - Stan ładowania (`LoadingState`, `loading.tsx`) z animowanym wskaźnikiem i etykietą dostępności.
  - Stan błędu (`ErrorState`, `error.tsx`) z kodem błędu i przyciskiem ponowienia akcji.
  - Stan braku danych (`EmptyState`) z opisem i opcjonalnym przyciskiem akcji.
  - Stan braku uprawnień (`UnauthorizedState`) informujący o odmowie dostępu (403 Forbidden) ze wskazaniem brakującej roli.

### T26. Dodać API listy i szczegółów ucznia

- `GET /api/students/`: lista uczniów aktywnej szkoły (`X-School-ID`) z paginacją, wyszukiwaniem (`?search=` po imieniu, nazwisku, PESEL i numerze w księdze), filtrami (`?status=`, `?cohort=`, `?academic_year=`) i sortowaniem (`?ordering=`).
- `GET /api/students/{id}/`: szczegóły ucznia z historią przebiegu nauki (`history_entries`) i rejestrem korekt danych (`data_corrections`). Uczeń innej szkoły daje 404.

### T27. Zbudować listę i szczegóły ucznia w Next.js

**Księga uczniów (`/students`)** (`frontend/src/components/students/students-list.tsx`):

- tabela: nr w księdze, uczeń, PESEL lub dokument zastępczy, klasa, status, data urodzenia; nazwisko prowadzi do szczegółów;
- wyszukiwanie z opóźnieniem 300 ms, filtry statusu i klasy, sortowanie po kliknięciu w nagłówek kolumny (`aria-sort`), paginacja;
- status, klasa, sortowanie i numer strony są w URL, więc po powrocie ze szczegółów filtry zostają. **Tekst wyszukiwania celowo nie trafia do URL**, bo może zawierać nazwisko lub PESEL (dane osobowe nie mogą trafiać do adresów ani historii przeglądarki);
- stany: ładowanie, błąd z ponowieniem, brak uprawnień (403), pusta księga, brak wyników dla filtrów (z „Wyczyść filtry”), brak aktywnej szkoły.

**Szczegóły ucznia (`/students/[id]`)** (`frontend/src/components/students/student-details.tsx`):

- dane ucznia (imiona, nazwisko, data i miejsce urodzenia, PESEL albo dokument zastępczy, nr w księdze, status);
- obecna klasa i rok szkolny;
- historia przebiegu nauki (przyjęcie, promocje, przeniesienia… z datą, rokiem, zmianą klasy i podstawą wpisu);
- historia zmian danych: autor, czas, powód korekty i tabela „pole / było / jest”;
- uczeń innej szkoły lub nieistniejący: „Nie znaleziono ucznia” z powrotem do listy.

**Dane z API** pobiera hook `useApiQuery` (`frontend/src/lib/api/use-api-query.ts`) przez typowany klient z T23. Przerywa nieaktualne żądania (szybkie przełączanie stron i filtrów nie pokaże spóźnionej odpowiedzi) i pokazuje poprzednią stronę, dopóki ładuje się następna.

Nowy endpoint dla filtra klas: **`GET /api/cohorts/`**, czyli klasy aktywnej szkoły (tylko odczyt, najnowszy rok szkolny pierwszy, filtr `?academic_year=`).

### T28. Dodać testy uwierzytelniania i izolacji

**Uprawnienia ról w backendzie.** Do tej pory każdy członek szkoły mógł odczytać każdy endpoint szkoły, a role ograniczał tylko interfejs. Teraz backend sprawdza rolę w aktywnej szkole (`HasSchoolRole` + `allowed_roles` w widoku). Macierz dostępu i kody odpowiedzi są w **[`docs/permissions.md`](docs/permissions.md)**, a wymagane role są też opisane przy operacjach w OpenAPI.

**Testy backendu** (`backend/apps/core/tests/test_auth_isolation.py`):

- macierz każda rola × każdy endpoint (200 albo 403 `permission_denied`) oraz 401 dla niezalogowanych;
- izolacja szkół: obcy `X-School-ID` (także `?school_id=`) daje 403, obiekt innej szkoły daje 404, listy zawierają tylko dane własnej szkoły, rola liczona osobno w każdej szkole;
- sesja: atrybuty cookie (HttpOnly, SameSite, czas życia), wygaśnięcie sesji daje 401, cookie bezużyteczne po wylogowaniu, dezaktywacja konta (401) i członkostwa (403) oraz zmiana roli działają od następnego żądania.

**Testy E2E** (Playwright, `frontend/e2e/auth.spec.ts`), przechodzące przez przeglądarkę, proxy Next.js i Django:

- przekierowanie niezalogowanego na logowanie i powrót na żądaną stronę, błędne hasło, sesja niedostępna dla JavaScriptu;
- dla każdej z 5 ról: etykieta roli, menu i bezpośrednie wejście na `/students` (lista albo „Brak uprawnień (403)”), API odrzuca rolę także z pominięciem UI;
- wylogowanie i utrata sesji przekierowują na logowanie;
- uczeń innej szkoły nie pojawia się na liście i nie otwiera się pod bezpośrednim adresem.

Dane testowe tworzy `python manage.py seed_e2e`: dwie fikcyjne szkoły, konto dla każdej roli i stałe identyfikatory. Komenda działa tylko przy `DEBUG=True`, bo konta mają znane hasło.

Uruchomienie E2E lokalnie (na działającym Docker Compose):

```bash
docker exec ts_django_backend python manage.py seed_e2e
npx --prefix frontend playwright install chromium   # jednorazowo
npm run test:e2e
```

W CI osobny job **E2E (Playwright)** stawia Postgresa, Django z `seed_e2e` i produkcyjny build Next.js, uruchamia testy, a przy błędzie zapisuje raport i logi serwerów jako artefakt.

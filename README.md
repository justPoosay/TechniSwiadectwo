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

### T12. Udokumentować lokalne uruchomienie

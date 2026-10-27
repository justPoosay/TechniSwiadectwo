# Testy uwierzytelniania, uprawnień i izolacji szkół (T28)

Macierz uprawnień ról: [`permissions.md`](permissions.md).

## Testy backendu

`backend/apps/core/tests/test_auth_isolation.py`:

- **role**: każda rola × każdy endpoint daje 200 albo 403 (`permission_denied`); niezalogowany dostaje 401 (`not_authenticated`);
- **izolacja szkół**: obcy `X-School-ID` (także `?school_id=`) daje 403, obiekt innej szkoły daje 404 (API nie zdradza, że istnieje), listy zawierają tylko dane własnej szkoły, rola jest liczona osobno w każdej szkole;
- **sesja**: atrybuty cookie (HttpOnly, SameSite, czas życia), wygasła sesja daje 401, cookie bezużyteczne po wylogowaniu, dezaktywacja konta (401) i członkostwa (403) oraz zmiana roli działają od następnego żądania.

```bash
pytest backend/apps/core/tests/test_auth_isolation.py
```

## Testy E2E (Playwright)

`frontend/e2e/auth.spec.ts`. Testy przechodzą przez przeglądarkę, proxy Next.js i Django:

- niezalogowany trafia na logowanie i wraca na żądaną stronę; błędne hasło; cookie sesji niedostępne dla JavaScriptu;
- dla każdej z 5 ról: etykieta roli, menu i bezpośrednie wejście na `/students` (lista albo „Brak uprawnień (403)”); API odrzuca rolę także z pominięciem interfejsu;
- wylogowanie i utrata sesji przekierowują na logowanie;
- uczeń innej szkoły nie pojawia się na liście i nie otwiera się pod bezpośrednim adresem.

### Dane testowe

`python manage.py seed_e2e` tworzy dwie fikcyjne szkoły (`E2E Szkoła A`, `E2E Szkoła B`), konto dla każdej roli w szkole A (`e2e-<rola>@szkola-a.test`) i ucznia o stałym identyfikatorze w szkole B. Komendę można uruchamiać wielokrotnie. Działa tylko przy `DEBUG=True` (albo z `--force`), bo konta mają znane hasło: `E2E_PASSWORD`, domyślnie `e2e-Haslo-Testowe-1`.

### Uruchomienie lokalne (na działającym Docker Compose)

```bash
docker exec ts_django_backend python manage.py seed_e2e
npx --prefix frontend playwright install chromium   # jednorazowo
npm run test:e2e
```

Adres aplikacji można zmienić zmienną `E2E_BASE_URL` (domyślnie `http://localhost:3000`).

> Jeśli po przełączeniu gałęzi kontener frontendu serwuje starą wersję stron albo zgłasza `Module not found`, zrestartuj go (`docker restart ts_next_frontend`) i zapisz zmieniony plik. Turbopack w Dockerze na Windows potrafi przegapić zmiany plików.

### CI

Job **E2E (Playwright)** w `.github/workflows/ci.yml` stawia PostgreSQL, Django z `seed_e2e` i produkcyjny build Next.js, a następnie uruchamia testy. Przy błędzie zapisuje raport Playwright i logi serwerów jako artefakt `e2e-report`.

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

- Python;
- Django;
- Django REST Framework;
- PostgreSQL.

### Frontend

- Next.js;
- TypeScript;
- App Router.

### Jakość i infrastruktura

- Docker;
- testy jednostkowe, integracyjne i end-to-end;
- automatyczna kontrola formatowania, typów i jakości kodu;
- CI uruchamiane dla zmian w repozytorium.

## Struktura repozytorium

```text
backend/    aplikacja Django i REST API
frontend/   aplikacja Next.js
docs/       dokumentacja techniczna i decyzje architektoniczne
infra/      konfiguracja środowiska i infrastruktury
```

## Pierwsze uruchomienie po sklonowaniu repozytorium

Poniższa instrukcja opisuje konfigurację backendu w systemie Windows przy użyciu PowerShella. Środowisko wirtualne, hasła i lokalna baza danych nie są przechowywane w Git, dlatego każdy członek zespołu tworzy je na swoim komputerze.

### 1. Wymagane oprogramowanie

Przed rozpoczęciem należy zainstalować:

- Git;
- Python 3.13;
- PostgreSQL;
- opcjonalnie pgAdmin do graficznego zarządzania PostgreSQL.

Poprawność instalacji można sprawdzić poleceniami:

```powershell
git --version
python --version
psql --version
```

Jeżeli `psql` nie jest rozpoznawany, można użyć narzędzia SQL w pgAdmin albo dodać katalog `bin` PostgreSQL do zmiennej `PATH`.

### 2. Sklonowanie repozytorium

```powershell
git clone <adres-repozytorium>
cd TechniSwiadectwo
```

W miejsce `<adres-repozytorium>` należy wstawić adres HTTPS lub SSH projektu.

### 3. Utworzenie środowiska wirtualnego

Każdy programista tworzy własny katalog `backend/.venv`. Nie należy kopiować go od innej osoby ani dodawać do repozytorium.

```powershell
cd backend
python -m venv .venv
```

Nie trzeba aktywować środowiska, jeśli polecenia są wykonywane bezpośrednio przez znajdujący się w nim interpreter:

```powershell
.\.venv\Scripts\python.exe --version
```

Alternatywnie można aktywować środowisko poleceniem:

```powershell
.\.venv\Scripts\Activate.ps1
```

Jeśli PowerShell blokuje aktywację skryptu, można nadal używać pełnej ścieżki `.\.venv\Scripts\python.exe` pokazanej w dalszej części instrukcji.

### 4. Instalacja zależności Pythona

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements\dev.txt
```

Plik `requirements/base.txt` zawiera zależności aplikacji, a `requirements/dev.txt` dodatkowo narzędzia potrzebne podczas programowania i testowania.

### 5. Utworzenie użytkownika i bazy PostgreSQL

Należy połączyć się z PostgreSQL jako administrator, na przykład:

```powershell
psql -U postgres
```

Następnie w konsoli PostgreSQL wykonać poniższe polecenia. Hasło `lokalne-haslo` należy zastąpić własnym hasłem używanym tylko w lokalnym środowisku:

```sql
CREATE USER techniswiadectwo WITH PASSWORD 'lokalne-haslo';
CREATE DATABASE techniswiadectwo OWNER techniswiadectwo;
```

Konsolę PostgreSQL można zamknąć poleceniem:

```text
\q
```

Te same operacje można wykonać w pgAdmin, tworząc użytkownika `techniswiadectwo` oraz bazę `techniswiadectwo`, której właścicielem będzie ten użytkownik.

### 6. Konfiguracja zmiennych środowiskowych

Plik `backend/.env.example` jest wzorem wymaganej konfiguracji. Można utworzyć lokalną kopię:

```powershell
Copy-Item .env.example .env
```

Plik `.env` jest ignorowany przez Git i nie wolno umieszczać w nim haseł używanych przez inne osoby lub środowiska. Na obecnym etapie Django nie wczytuje tego pliku automatycznie. Przed uruchomieniem aplikacji trzeba ustawić zmienne w bieżącej sesji PowerShella:

```powershell
$env:POSTGRES_DB="techniswiadectwo"
$env:POSTGRES_USER="techniswiadectwo"
$env:POSTGRES_PASSWORD="lokalne-haslo"
$env:POSTGRES_HOST="localhost"
$env:POSTGRES_PORT="5432"
```

Zmienne ustawione w ten sposób obowiązują do zamknięcia bieżącego okna PowerShella. Po otwarciu nowego okna należy ustawić je ponownie.

W trybie lokalnym `manage.py` automatycznie używa ustawień `config.settings.development`. Nie trzeba ustawiać `DJANGO_SECRET_KEY`, ponieważ konfiguracja developerska ma osobny, nieprodukcyjny klucz.

### 7. Sprawdzenie konfiguracji i migracje

```powershell
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py migrate
```

Polecenie `migrate` powinno połączyć się z lokalną bazą PostgreSQL i utworzyć wymagane tabele Django.

### 8. Uruchomienie serwera

```powershell
.\.venv\Scripts\python.exe manage.py runserver
```

Serwer działa domyślnie pod adresem `http://127.0.0.1:8000/`. Endpoint kontrolny:

```text
http://127.0.0.1:8000/api/health/
```

Powinien zwrócić kod HTTP 200 i odpowiedź:

```json
{"status": "ok"}
```

Serwer można zatrzymać skrótem `Ctrl+C`.

### 9. Uruchomienie testów

Testy korzystają z osobnej konfiguracji i bazy SQLite w pamięci, dlatego nie modyfikują lokalnej bazy PostgreSQL:

```powershell
.\.venv\Scripts\python.exe -m pytest
```

Kontrolę brakujących migracji można wykonać poleceniem:

```powershell
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run --settings=config.settings.test
```

### 10. Codzienna praca po pierwszej konfiguracji

Po ponownym uruchomieniu komputera lub otwarciu nowej sesji PowerShella nie trzeba tworzyć `.venv` ani instalować wszystkich paczek od początku. Należy:

1. przejść do katalogu `backend`;
2. ustawić zmienne `POSTGRES_*` w bieżącej sesji;
3. pobrać nowe zmiany z repozytorium;
4. ponownie wykonać instalację z `requirements/dev.txt`, jeśli zmieniły się zależności;
5. uruchomić migracje, jeśli pojawiły się nowe pliki migracji;
6. uruchomić testy i serwer.

Przykładowy zestaw poleceń:

```powershell
git pull
$env:POSTGRES_DB="techniswiadectwo"
$env:POSTGRES_USER="techniswiadectwo"
$env:POSTGRES_PASSWORD="lokalne-haslo"
$env:POSTGRES_HOST="localhost"
$env:POSTGRES_PORT="5432"
.\.venv\Scripts\python.exe -m pip install -r requirements\dev.txt
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\python.exe manage.py runserver
```

### Najczęstsze problemy

#### `python` nie jest rozpoznawany

Python nie znajduje się w `PATH`. Należy ponownie uruchomić instalator Pythona i zaznaczyć opcję dodania Pythona do `PATH`.

#### Nie można uruchomić `Activate.ps1`

Aktywacja nie jest wymagana. Należy wykonywać polecenia przez `.\.venv\Scripts\python.exe`.

#### `connection refused` albo błąd połączenia z PostgreSQL

Należy sprawdzić, czy usługa PostgreSQL działa, czy port jest poprawny oraz czy wartości `POSTGRES_DB`, `POSTGRES_USER` i `POSTGRES_PASSWORD` odpowiadają lokalnej bazie.

#### `password authentication failed`

Hasło ustawione w `POSTGRES_PASSWORD` nie zgadza się z hasłem użytkownika PostgreSQL. Należy poprawić zmienną albo hasło lokalnego użytkownika bazy.

#### `No module named django`

Polecenie zostało wykonane poza właściwym środowiskiem lub zależności nie zostały zainstalowane. Należy użyć `.\.venv\Scripts\python.exe` i ponownie wykonać instalację `requirements/dev.txt`.

## Konfiguracja produkcyjna

Instrukcja powyżej dotyczy wyłącznie lokalnego środowiska developerskiego. Ustawienia `config.settings.production` wymagają między innymi silnego `DJANGO_SECRET_KEY`, listy `DJANGO_ALLOWED_HOSTS`, bezpiecznego połączenia HTTPS oraz właściwej konfiguracji PostgreSQL. Nie należy używać developerskich haseł ani kluczy na środowisku wdrożeniowym.

## Główne zasady bezpieczeństwa

- W repozytorium nie wolno umieszczać prawdziwych danych uczniów.
- Sekrety i lokalne pliki środowiskowe nie mogą być commitowane.
- Uprawnienia są zawsze egzekwowane przez backend.
- Dane poszczególnych szkół muszą być od siebie odseparowane.
- Wystawione dokumenty muszą zachowywać niezmienną wersję danych i użytego wzoru.
- Istotne operacje muszą pozostawiać wpis w historii audytowej.

## Status

Struktura repozytorium i backend Django zostały zainicjalizowane. Frontend Next.js nie został jeszcze utworzony.

## Licencja

Warunki wykorzystania projektu nie zostały jeszcze określone.


## Zrobione

### T07. Utworzenie projektu Django
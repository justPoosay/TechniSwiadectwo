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

## Uruchomienie backendu

Backend wymaga Pythona oraz działającej bazy PostgreSQL. W systemie Windows można przygotować środowisko poleceniami:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements\dev.txt
Copy-Item .env.example .env
```

Zmienne z `.env` należy ustawić zgodnie z lokalną konfiguracją PostgreSQL i udostępnić procesowi Django. Następnie można wykonać migracje i uruchomić serwer:

```powershell
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py runserver
```

Endpoint kontrolny jest dostępny pod adresem `http://127.0.0.1:8000/api/health/` i zwraca odpowiedź `{"status":"ok"}`.

Testy backendu uruchamia polecenie:

```powershell
.\.venv\Scripts\python.exe -m pytest
```

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

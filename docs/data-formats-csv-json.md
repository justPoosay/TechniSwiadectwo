# Specyfikacja formatów wymiany danych (CSV i JSON) — Księga Uczniów

**Wersja specyfikacji:** 1.0  
**Identyfikator formatu:** `techniswiadectwo/students-import/v1.0`  
**Data publikacji:** 2026-10-27  
**Status:** Obowiązujący (Draft / POC)

---

## 1. Wprowadzenie i cel

Dokument definiuje formalną specyfikację formatów plików **CSV** oraz **JSON** przeznaczonych do zasilania systemu TechniŚwiadectwo danymi uczniów, przypisaniami do oddziałów (klas) oraz wpisami do księgi uczniów.

Formaty zostały opracowane na podstawie słownika danych systemu (`apps.students.models.Student`, `apps.core.models.Cohort`, `apps.core.models.AcademicYear`, `apps.students.models.StudentHistoryEntry`).

Import danych wykonywany jest zawsze w kontekście **konkretnej szkoły** (identyfikowanej przez nagłówek `X-School-ID` lub wybór aktywnej szkoły w sesji użytkownika).

---

## 2. Ogólne wymagania techniczne

### 2.1 Kodowanie znaków
* **Wymagane kodowanie:** `UTF-8`.
* **Obsługa BOM:** Narzędzia importujące **muszą tolerować opcjonalny znacznik UTF-8 BOM** (`0xEF, 0xBB, 0xBF`) na początku pliku CSV. Jest to kluczowe dla plików generowanych i edytowanych w programie Microsoft Excel na systemach Windows.

### 2.2 Znaki końca linii (EOL)
* Obsługiwane są zarówno znaki `LF` (`\n`, systemy Unix/macOS), jak i `CRLF` (`\r\n`, system Windows).

### 2.3 Format dat
* **Wymagany format kanoniczny:** ISO 8601 — `YYYY-MM-DD` (np. `2008-04-15`).
* Dni i miesiące jednocyfrowe muszą być uzupełnione wiodącym zerem.
* Wszystkie daty podlegają rygorystycznej walidacji kalendarzowej (w tym uwzględnieniu lat przestępnych).
* `date_of_birth` (data urodzenia) nie może być datą z przyszłości.

### 2.4 Reprezentacja wartości pustych (Nullability)
* **CSV:** Wartość pusta reprezentowana jest jako **brak znaków pomiędzy separatorami** (np. `,,` lub `;;`) albo pusty ciąg ujęty w cudzysłowy (`""`).
  > **Ważne:** Teksty takie jak `"NULL"`, `"null"`, `"None"`, `"NaN"`, `"-"`, `"brak"` **nie są** traktowane jako puste — zostaną sparsowane jako dosłowna wartość tekstowa.
* **JSON:** Wartość pusta reprezentowana jest przez jawne `null` (np. `"second_name": null`) lub **całkowite pominięcie danego klucza** w obiekcie (dla pól oznaczonych jako opcjonalne).

---

## 3. Słownik pól (Data Dictionary)

Poniższa tabela stanowi jednoznaczne mapowanie między modelami bazy danych a polami importu:

| Nazwa pola (JSON / CSV kanoniczny) | Aliasy nagłówka CSV (PL) | Typ danych | Wymagane? | Opis i reguły walidacji |
|---|---|---|:---:|---|
| `external_id` | `id_zewnetrzne`, `id_systemu` | String(100) | Nie | Opcjonalny identyfikator rekordu w zewnętrznym systemie (np. ID w dzienniku elektronicznym). Nie jest tożsamy z UUID w TechniŚwiadectwo. |
| `register_number` | `numer_w_ksiedze`, `nr_ksiegi` | String(50) | **Tak** | Numer ewidencyjny w księdze uczniów danej szkoły (np. `U/101/2025`, `1234/2024`). Musi być unikalny w ramach szkoły. |
| `first_name` | `imie`, `pierwsze_imie` | String(100) | **Tak** | Pierwsze imię ucznia (min. 1 znak po usunięciu białych znaków). |
| `second_name` | `drugie_imie` | String(100) | Nie | Drugie imię ucznia. Wartość pusta oznacza brak drugiego imienia. |
| `last_name` | `nazwisko` | String(100) | **Tak** | Nazwisko ucznia (obsługa nazwisk dwuczłonowych, np. `Kowalska-Nowak`). |
| `date_of_birth` | `data_urodzenia` | Date (`YYYY-MM-DD`) | **Tak** | Data urodzenia ucznia. |
| `place_of_birth` | `miejsce_urodzenia` | String(100) | **Tak** | Miejsce urodzenia (miejscowość). |
| `pesel` | `numer_pesel` | String(11) | Warunkowo | Numer PESEL (dokładnie 11 cyfr, poprawna suma kontrolna i zgodność zakodowanej daty z `date_of_birth`). **Wymagany, chyba że podano dokument tożsamości.** |
| `id_document_type` | `rodzaj_dokumentu`, `typ_dokumentu` | Enum(String) | Warunkowo | Wymagany w przypadku braku PESEL. Dozwolone wartości: `PASSPORT` (Paszport), `ID_CARD` (Dowód osobisty), `OTHER` (Inny dokument tożsamości). |
| `id_document_number` | `numer_dokumentu`, `nr_dokumentu` | String(50) | Warunkowo | Wymagany w przypadku braku PESEL (np. `AB 1234567`). |
| `status` | `status_ucznia` | Enum(String) | Nie | Status ucznia w szkole: `ACTIVE` (Uczęszcza - domyślny), `GRADUATED` (Absolwent), `WITHDRAWN` (Odszedł / Skreślony). |
| `cohort_name` | `klasa`, `oddzial` | String(10) | Nie | Oznaczenie klasy (np. `4A`, `1T`, `3C`). Jeśli klasa nie istnieje w danym roku szkolnym, system może ją automatycznie utworzyć lub zgłosić ostrzeżenie w zależności od trybu importu. |
| `cohort_level` | `poziom_klasy` | Integer | Nie | Poziom klasy (liczba 1–8 lub 1–5 dla technikum). Jeśli podano `cohort_name` i klasa jest tworzona, pole to określa jej poziom programowy. |
| `academic_year` | `rok_szkolny` | String(9) | Nie | Rok szkolny w formacie `YYYY/YYYY` (np. `2025/2026`). Jeśli nie podano, używany jest bieżący rok szkolny (`is_current=True`) aktywnej szkoły. |
| `admission_date` | `data_przyjecia` | Date (`YYYY-MM-DD`) | Nie | Data przyjęcia do szkoły / utworzenia wpisu w księdze. Jeśli brak, przyjmowana jest data początkowa roku szkolnego lub data importu. |
| `admission_document` | `uchwala_przyjecia`, `numer_decyzji` | String(100) | Nie | Opcjonalny numer decyzji dyrektora lub uchwały rekrutacyjnej (np. `RP/12/2025`). |

---

## 4. Specyfikacja formatu CSV

### 4.1 Zasady formatowania
1. **Zgodność ze standardem:** RFC 4180.
2. **Separator kolumn:** Domyślnym separatorem jest przecinek (`,`). Parser importu automatycznie rozpoznaje również średnik (`;`), który jest standardem regionalnym w polskim wydaniu programu Microsoft Excel.
3. **Kwalifikator tekstu (cytowanie):** Cudzysłów podwójny (`"`). Wartości zawierające przecinek, średnik, cudzysłów lub znak nowej linii muszą być ujęte w cudzysłów. Wewnętrzny cudzysłów jest escapowany podwójnym cudzysłowem (`""`).
4. **Wiersz nagłówka:** Pierwszy wiersz pliku **musi** zawierać nazwy kolumn. Wielkość liter w nagłówkach nie jest rozróżniana (angielskie nazwy kanoniczne lub polskie aliasy z tabeli w pkt. 3).
5. **Kolejność kolumn:** Kolejność kolumn jest dowolna — parser mapuje dane na podstawie nazw nagłówków.

### 4.2 Przykład pliku CSV

```csv
register_number,first_name,second_name,last_name,date_of_birth,place_of_birth,pesel,id_document_type,id_document_number,status,cohort_name,academic_year
U/001/2025,Jan,Michał,Kowalski,2007-03-15,Warszawa,07231501234,,,ACTIVE,4A,2025/2026
U/002/2025,Anna,,Nowak,2007-07-22,Kraków,07272209876,,,ACTIVE,4A,2025/2026
U/003/2025,Dmytro,,Shevchenko,2006-11-05,Kijów,,PASSPORT,XX123456,ACTIVE,4A,2025/2026
U/004/2025,Piotr,Paweł,Zieliński,2005-02-10,Warszawa,05221005555,,,GRADUATED,,2024/2025
```

---

## 5. Specyfikacja formatu JSON

### 5.1 Struktura dokumentu
Format JSON składa się z nadrzędnego obiektu metadanych paczki importowej oraz tablicy rekordów `students`. 

Struktura wspiera wersjonowanie formatu (`version: "1.0"`), opcjonalne określenie kontekstu szkoły oraz zagnieżdżone obiekty dla dokumentu tożsamości i przypisania do oddziału.

### 5.2 Schemat struktury (przykład)

```json
{
  "$schema": "urn:techniswiadectwo:schemas:v1:students-import",
  "version": "1.0",
  "generated_at": "2026-10-27T08:30:00Z",
  "source_system": "Librus / Vulcan / Rekrutacja",
  "academic_year": "2025/2026",
  "students": [
    {
      "external_id": "EXT-1001",
      "register_number": "U/001/2025",
      "first_name": "Jan",
      "second_name": "Michał",
      "last_name": "Kowalski",
      "date_of_birth": "2007-03-15",
      "place_of_birth": "Warszawa",
      "pesel": "07231501234",
      "id_document": null,
      "status": "ACTIVE",
      "cohort": {
        "name": "4A",
        "level": 4
      },
      "admission": {
        "event_date": "2025-09-01",
        "document_number": "UCH/10/2025",
        "notes": "Przyjęcie w postępowaniu rekrutacyjnym"
      }
    },
    {
      "external_id": "EXT-1002",
      "register_number": "U/003/2025",
      "first_name": "Dmytro",
      "second_name": null,
      "last_name": "Shevchenko",
      "date_of_birth": "2006-11-05",
      "place_of_birth": "Kijów",
      "pesel": null,
      "id_document": {
        "type": "PASSPORT",
        "number": "XX123456"
      },
      "status": "ACTIVE",
      "cohort": {
        "name": "4A",
        "level": 4
      },
      "admission": {
        "event_date": "2025-09-01",
        "document_number": "UCH/11/2025",
        "notes": null
      }
    }
  ]
}
```

---

## 6. Zasady walidacji i integralności danych

Każdy rekord poddawany jest dwustopniowej weryfikacji przed wprowadzeniem do bazy danych:

1. **Walidacja syntaktyczna i formalna (Single Record):**
   - Zgodność typów i formatów (`date_of_birth` zgodna z ISO 8601).
   - Wymóg tożsamości: rekord **musi** posiadać poprawny 11-cyfrowy `pesel` ALBO komplet `id_document_type` oraz `id_document_number`.
   - Algorytmiczna poprawność PESEL (wagi `1, 3, 7, 9, 1, 3, 7, 9, 1, 3` i suma kontrolna).
   - Zgodność daty urodzenia z datą zakodowaną w numerze PESEL.

2. **Walidacja integralności i unikalności (Batch & Database Scoped):**
   - `register_number` musi być unikalny w obrębie importowanego pliku oraz w obrębie szkoły docelowej.
   - `pesel` (o ile występuje) musi być unikalny w obrębie importowanego pliku oraz w szkole docelowej.
   - Klasa docelowa (`cohort_name`): weryfikacja przynależności do tej samej szkoły w danym roku szkolnym.

3. **Strategia obsługi duplikatów i konfliktów:**
   - Domyślny tryb walidacji to **Dry-Run (podgląd bez zapisu)** zwracający raport: liczba poprawnych rekordów, ostrzeżeń i błędów krytycznych.
   - W przypadku wykrycia błędu krytycznego chociażby w jednym wierszu, operacja importu zostaje domyślnie wycofana (transakcyjność atomowa per plik).

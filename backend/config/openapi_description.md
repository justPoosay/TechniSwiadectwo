API modułu dokumentacji szkolnej TechniŚwiadectwo (POC, wyłącznie dane fikcyjne).

Frontend wywołuje API przez reverse proxy Next.js pod tym samym adresem (`/api/...`).

## Uwierzytelnianie

1. `GET /api/auth/csrf/` ustawia cookie `csrftoken`.
2. `POST /api/auth/login/` z nagłówkiem `X-CSRFToken: <csrftoken>` tworzy sesję (cookie `sessionid`, HttpOnly).
3. Każde żądanie `POST`/`PUT`/`PATCH`/`DELETE` wymaga nagłówka `X-CSRFToken`. Logowanie obraca token, więc trzeba odczytać nową wartość cookie.

Statusy: **401** = brak sesji (trzeba się zalogować), **403** = brak uprawnień albo błąd CSRF.

## Kontekst szkoły

Endpointy danych szkoły wymagają nagłówka `X-School-ID` z identyfikatorem szkoły, w której użytkownik ma aktywne członkostwo (lista w `GET /api/auth/me/` → `memberships`). Bez niego lub dla obcej szkoły odpowiedź to 403.

## Paginacja

Listy przyjmują `?page=<n>&page_size=<n>` (domyślnie 25, maksymalnie 100) i zwracają:

```json
{"count": 123, "page": 1, "page_size": 25, "total_pages": 5, "results": []}
```

Strona spoza zakresu daje 404.

## Filtrowanie, wyszukiwanie, sortowanie

- filtry: parametry nazwane jak pola, np. `?action=login`;
- wyszukiwanie tekstowe: `?search=<tekst>`;
- sortowanie: `?ordering=created_at` (rosnąco) lub `?ordering=-created_at` (malejąco).

Dostępne parametry są opisane przy każdym endpoincie.

## Format błędów

Każdy błąd ma ten sam kształt (`ErrorResponse`):

```json
{
  "code": "validation_error",
  "detail": "Popraw zaznaczone pola formularza.",
  "field_errors": {"email": ["Wprowadź poprawny adres e-mail."]}
}
```

| Status | `code` |
| --- | --- |
| 400 | `validation_error`, `parse_error` |
| 401 | `not_authenticated` |
| 403 | `permission_denied`, `csrf_failed` |
| 404 | `not_found` |
| 405 | `method_not_allowed` |
| 500 | `server_error` |
| 502 / 504 | `backend_unavailable` / `backend_timeout` (zwraca proxy Next.js) |

`field_errors` występuje tylko przy błędach walidacji. Pola zagnieżdżone mają klucze z kropką, np. `guardians.0.phone`.

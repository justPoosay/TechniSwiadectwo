# Uprawnienia ról

Macierz dostępu dla zaimplementowanych endpointów. Backend egzekwuje ją przez `apps.core.permissions.HasSchoolRole` (atrybut `allowed_roles` widoku), a frontend ukrywa niedostępne pozycje menu i pokazuje stan „Brak uprawnień (403)”. Źródłem prawdy jest backend: frontend tylko dopasowuje interfejs.

Rola liczy się **w aktywnej szkole** (nagłówek `X-School-ID`). Ta sama osoba może mieć różne role w różnych szkołach.

| Endpoint | Sekretariat | Nauczyciel | Wychowawca | Dyrekcja | Admin |
| --- | :-: | :-: | :-: | :-: | :-: |
| `GET /api/auth/me/` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /api/cohorts/` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /api/students/`, `/api/students/{id}/` | ✅ | ❌ | ❌ | ✅ | ✅ |
| `GET /api/audit-logs/`, `/api/audit-logs/{id}/` | ❌ | ❌ | ❌ | ✅ | ✅ |

Kody odpowiedzi:

| Sytuacja | Status | `code` |
| --- | --- | --- |
| brak sesji, sesja wygasła, konto dezaktywowane | 401 | `not_authenticated` |
| brak `X-School-ID`, szkoła bez aktywnego członkostwa, członkostwo dezaktywowane | 403 | `permission_denied` |
| rola bez dostępu do endpointu | 403 | `permission_denied` |
| obiekt innej szkoły przy własnym `X-School-ID` | 404 | `not_found` |

Obiekt innej szkoły daje 404, a nie 403, żeby API nie zdradzało, że taki obiekt istnieje. Zmiana roli lub dezaktywacja działa od następnego żądania, bez ponownego logowania.

Wymagane role są też opisane przy każdej operacji w kontrakcie OpenAPI (`docs/api/openapi.yaml`, „Wymagane role w szkole”).

Testy: `backend/apps/core/tests/test_auth_isolation.py` (backend, macierz rola × endpoint) oraz `frontend/e2e/auth.spec.ts` (E2E).

Kolejne widoki (oceny, egzaminy, dokumenty) dopisują się do tej tabeli. Pełną macierz operacji dla wszystkich ról przewiduje zadanie T04.

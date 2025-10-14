# 1. Wprowadzenie i cele testowania  
Celem niniejszego planu jest zapewnienie wysokiej jakości, stabilności i bezpieczeństwa aplikacji opartej na Astro, React, TailwindCSS i Supabase. Testy mają zweryfikować poprawność kluczowych funkcjonalności, zgodność z wymaganiami biznesowymi oraz odporność na nieoczekiwane warunki.

# 2. Zakres testów  
- Frontend: komponenty React/Astro (formularze, nawigacja, widoki)  
- Backend: API Astro (ścieżki w `src/pages/api`), usługi w `src/lib/services`, walidacje Zod  
- Integracja z Supabase (autoryzacja, CRUD na tabelach: currencies, accounts, categories, transactions)  
- UI/UX: responsywność, dostępność (WCAG)  
- Bezpieczeństwo: autoryzacja, kontrola ról, RLS  
- Wydajność: czas ładowania kluczowych stron i zapytań do bazy  

# 3. Typy testów do przeprowadzenia  
1. **Testy jednostkowe**  
   - Logika usług (`AuthService`, `AccountService`, `TransactionService` itp.)  
   - Walidacje Zod w `src/lib/validation/schemas.ts`  
   - Pomocnicze funkcje w `src/lib/utils.ts`  
2. **Testy integracyjne**  
   - Endpoints API (`src/pages/api/*.ts`) z użyciem instancji Supabase w trybie testowym  
   - Integracja formularzy z backendem (np. rejestracja, logowanie)  
3. **Testy end-to-end (E2E)**  
   - Pełne ścieżki użytkownika: rejestracja, logowanie, CRUD kont, kategorii, transakcji  
   - Scenariusze negatywne: walidacja formularzy, nieautoryzowany dostęp  
4. **Testy wydajnościowe**  
   - Pomiar czasu odpowiedzi API pod obciążeniem (np. 100 równoległych zapytań)  
   - Lighthouse dla stron kluczowych (landing, dashboard, formularze)  
5. **Testy bezpieczeństwa**  
   - Próby dostępu do zasobów bez tokena / z wygasłym tokenem  
   - SQL-injection / XSS-injection w polach formularzy  
6. **Testy dostępności (a11y)**  
   - Automatyczne audyty (axe-core)  
   - Ręczne sprawdzenie kontrastu i nawigacji klawiaturą  

# 4. Scenariusze testowe dla kluczowych funkcjonalności  

## 4.1 Authentication  
- Rejestracja: poprawne i niepoprawne dane (e-mail, hasło)  
- Logowanie: poprawne i niepoprawne dane, blokada po X nieudanych próbach  
- Reset hasła: wysyłanie linku, użycie linku, nieaktualny link  
- Aktualizacja hasła: walidacja, konflikty  

## 4.2 Accounts  
- Dodawanie konta: wymagane pola, unikalność nazwy  
- Edycja konta: zmiana nazwy, walidacja formatu  
- Usuwanie konta: potwierdzenie w modal, cascade delete transakcji  

## 4.3 Categories  
- CRUD kategorii: nazwa, opis, kolor  
- Przełączanie zakładek w `CategoriesTabs`  
- Obsługa błędów (np. duplikat nazwy)  

## 4.4 Transactions  
- Tworzenie transakcji z różnymi walutami  
- Filtrowanie transakcji (data, kategoria, kwota)  
- Paginação i nawigacja między stronami  
- Usuwanie/edycja transakcji: korekty stanu kont  

## 4.5 UI/UX i nawigacja  
- Menu nawigacyjne (`Navigation.astro`): linki, responsywność  
- Layout i styl globalny (TailwindCSS)  
- Komponenty Shadcn/UI: dialogi, przyciski, zakładki  

# 5. Środowisko testowe  
- Node.js LTS (v20+)  
- Astro 5, TypeScript 5, React 19  
- Lokalny emulator Supabase lub osobna baza testowa  
- Przeglądarki: Chrome, Firefox, Safari (E2E)  
- CI: GitHub Actions z matrycą systemów  

# 6. Narzędzia do testowania  
- Unit/Integration: Vitest + Testing Library (React + Astro)  
- E2E: Playwright  
- Wydajność: k6 (API), Lighthouse CI (frontend)  
- Bezpieczeństwo: OWASP ZAP, axe-core  
- Lintery: ESLint, TailwindCSS linter, Prettier  

# 7. Kryteria akceptacji testów  
- Pokrycie jednostkowe ≥ 85% dla kluczowych modułów  
- Brak krytycznych lub wysokich defektów blokujących  
- Pozytywne wyniki audytów bezpieczeństwa i dostępności  
- Próg wydajnościowy: API ≤ 200 ms, strona startowa ≤ 1 s  

# 8. Role i odpowiedzialności  
- QA Engineer: pisanie i utrzymanie testów, raportowanie defektów  
- Developerzy: weryfikacja i naprawa błędów, code review testów  
- DevOps: konfiguracja CI, utrzymanie środowisk testowych  
- Product Owner: akceptacja wyników testów  

# 9. Procedury raportowania błędów  
1. Zgłoszenie w GitHub Issues z etykietami: `bug`, `severity/{critical,high,medium,low}`  
2. Szablon zgłoszenia:  
   - **Opis**: kroki do odtworzenia  
   - **Oczekiwane zachowanie**  
   - **Rzeczywiste zachowanie**  
   - **Środowisko**: wersja aplikacji, przeglądarka, OS  
   - **Załączniki**: zrzuty ekranu, logi konsoli  
3. Priorytetyzacja i przypisanie do zespołu deweloperskiego  
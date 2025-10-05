<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Product Requirements Document (PRD)

## Baza Danych - Aplikacja Expense Tracking MVP


***

## 1. Executive Summary

### 1.1 Cel dokumentu

Niniejszy dokument określa szczegółowe wymagania dla warstwy bazodanowej aplikacji expense tracking, przeznaczonej do zarządzania wydatkami i przychodami rodzinnymi.[^1][^4]

### 1.2 Produkt

System bazodanowy oparty na PostgreSQL w Supabase, zaprojektowany do obsługi wieloużytkownikowej aplikacji webowej do śledzenia transakcji finansowych z pełną izolacją danych między użytkownikami.[^10][^11]

### 1.3 Kluczowe założenia

- Backend: Supabase (PostgreSQL)
- Frontend: Astro v5.5.5 + React v19.0.0 + TypeScript v5
- Architektura: Multi-tenant z izolacją danych per user_id
- Strategia: Soft delete, obliczanie sald w kodzie aplikacji

***

## 2. Cele produktu

### 2.1 Cele biznesowe

- Umożliwić rodzinom efektywne śledzenie wydatków i przychodów
- Zapewnić prostą, intuicyjną strukturę danych bez nadmiernej złożoności
- Osiągnąć czas odpowiedzi < 200ms dla typowych operacji


### 2.2 Cele techniczne

- Zapewnić pełną izolację danych między użytkownikami
- Zoptymalizować wydajność zapytań przez strategiczne indeksy[^12][^13]
- Umożliwić łatwe skalowanie wraz ze wzrostem liczby użytkowników
- Zapewnić integralność danych bez skomplikowanych triggerów

***

## 4. Wymagania funkcjonalne

### 4.1 Zarządzanie walutami

**REQ-DB-001: Przechowywanie walut**

- System musi przechowywać predefiniowaną listę walut
- Każda waluta zawiera: kod ISO 4217 (3 znaki), opis, flagę aktywności
- Waluty są globalne dla wszystkich użytkowników
- Waluty nie mogą być usuwane (brak soft delete)

**Kryteria akceptacji:**

- ✓ Kod waluty musi być unikalny i w formacie XXX (wielkie litery)
- ✓ Dostęp read-only dla użytkowników przez RLS
- ✓ Predefiniowane waluty: PLN, EUR, USD, GBP, CHF, CZK


### 4.2 Zarządzanie kontami

**REQ-DB-002: Konta użytkownika**

- System musi umożliwiać tworzenie, edycję i usuwanie kont finansowych
- Każde konto zawiera: nazwę, walutę, opcjonalny tag (max 10 znaków), flagę aktywności
- Konta są izolowane per user_id
- Saldo NIE jest cache'owane w tabeli - obliczane on-demand

**Kryteria akceptacji:**

- ✓ Nazwa konta nie może być pusta
- ✓ Każde konto musi mieć przypisaną walutę
- ✓ Użytkownik widzi tylko własne konta (RLS)
- ✓ Soft delete przez flagę active


### 4.3 Zarządzanie kategoriami

**REQ-DB-003: Kategorie wydatków i przychodów**

- System musi obsługiwać hierarchię kategorii (max 2 poziomy)
- Kategoria główna: parent_id = 0
- Podkategoria: parent_id > 0 (wskazuje na kategorię główną)
- Podkategorie nie mogą mieć własnych dzieci

**Kryteria akceptacji:**

- ✓ parent_id = 0 oznacza kategorię główną
- ✓ Maksymalnie 2-poziomowa hierarchia (walidowana przez trigger)
- ✓ Nazwa kategorii nie może być pusta
- ✓ Użytkownik widzi tylko własne kategorie (RLS)
- ✓ Soft delete przez flagę active
- ✓ Walidacja istnienia rodzica przy tworzeniu podkategorii


### 4.4 Zarządzanie transakcjami

**REQ-DB-004: Transakcje finansowe**

- System musi przechowywać wszystkie transakcje użytkownika
- Transakcja zawiera: datę z czasem, konto, kategorię, kwotę, walutę, komentarz
- Kwota może być ujemna (wydatek), zero lub dodatnia (przychód)
- Data przechowywana z czasem (TIMESTAMPTZ), w UI wyświetlana tylko data

**Kryteria akceptacji:**

- ✓ Kwota w zakresie -9999999999.99 do 9999999999.99
- ✓ Kwota zero jest dozwolona
- ✓ Każda transakcja musi mieć konto, kategorię i walutę
- ✓ Komentarz jest opcjonalny
- ✓ Użytkownik widzi tylko własne transakcje (RLS)
- ✓ Soft delete przez flagę active

***

## 5. Architektura bazy danych

### 5.1 Schemat tabel

**Tabela: currencies**

```
- id (SERIAL) PK
- code (VARCHAR(3)) UNIQUE NOT NULL
- description (VARCHAR(100)) NOT NULL
- active (BOOLEAN) DEFAULT true
- created_at (TIMESTAMPTZ) DEFAULT NOW()
- updated_at (TIMESTAMPTZ) DEFAULT NOW()
```

**Tabela: accounts**

```
- id (BIGSERIAL) PK
- user_id (UUID) NOT NULL
- name (VARCHAR(100)) NOT NULL
- currency_id (INTEGER) FK -> currencies.id
- tag (VARCHAR(10))
- active (BOOLEAN) DEFAULT true
- created_at (TIMESTAMPTZ) DEFAULT NOW()
- updated_at (TIMESTAMPTZ) DEFAULT NOW()
```

**Tabela: categories**

```
- id (BIGSERIAL) PK
- user_id (UUID) NOT NULL
- name (VARCHAR(100)) NOT NULL
- parent_id (BIGINT) DEFAULT 0 NOT NULL
- tag (VARCHAR(10))
- active (BOOLEAN) DEFAULT true
- created_at (TIMESTAMPTZ) DEFAULT NOW()
- updated_at (TIMESTAMPTZ) DEFAULT NOW()
```

**Tabela: transactions**

```
- id (BIGSERIAL) PK
- user_id (UUID) NOT NULL
- transaction_date (TIMESTAMPTZ) NOT NULL
- account_id (BIGINT) FK -> accounts.id
- category_id (BIGINT) FK -> categories.id
- amount (DECIMAL(12,2)) NOT NULL
- currency_id (INTEGER) FK -> currencies.id
- comment (TEXT)
- active (BOOLEAN) DEFAULT true
- created_at (TIMESTAMPTZ) DEFAULT NOW()
- updated_at (TIMESTAMPTZ) DEFAULT NOW()
```


### 5.2 Relacje

```
currencies (1) ----< (N) accounts
currencies (1) ----< (N) transactions
accounts (1) ----< (N) transactions
categories (1) ----< (N) transactions
categories (1) ----< (N) categories (self-reference, parent_id)
```


### 5.3 Klucze i indeksy

**REQ-DB-005: Strategia kluczy głównych**

- Wszystkie tabele używają numerycznych auto-increment keys (SERIAL/BIGSERIAL)
- Uzasadnienie: Lepsza wydajność indeksów ~50% vs UUID, mniejsze zużycie miejsca[^13][^14][^15]

**REQ-DB-006: Indeksy podstawowe**

```sql
-- Izolacja użytkowników
idx_accounts_user_active (user_id, active) WHERE active = true
idx_categories_user_active (user_id, active) WHERE active = true
idx_transactions_user_active (user_id, active) WHERE active = true

-- Foreign keys
idx_transactions_account (account_id) WHERE active = true
idx_transactions_category (category_id) WHERE active = true
idx_transactions_currency (currency_id)
idx_accounts_currency (currency_id)

-- Filtrowanie
idx_transactions_date (transaction_date DESC) WHERE active = true
idx_categories_main (user_id) WHERE parent_id = 0 AND active = true
idx_categories_parent (parent_id, user_id) WHERE parent_id > 0 AND active = true
```

**REQ-DB-007: Indeksy złożone**

```sql
-- Obliczanie salda
idx_transactions_balance (user_id, account_id, active) WHERE active = true

-- Lista transakcji
idx_transactions_user_date (user_id, transaction_date DESC) WHERE active = true

-- Analiza wydatków
idx_transactions_category_spending (category_id, transaction_date, amount) WHERE active = true
```


***

## 6. Wymagania bezpieczeństwa

### 6.1 Row Level Security (RLS)

**REQ-SEC-001: Izolacja danych użytkowników**

- Wszystkie tabele z user_id muszą mieć włączone RLS[^11][^10]
- Polityka: użytkownik widzi tylko rekordy gdzie `auth.uid() = user_id`
- Wyjątek: tabela currencies dostępna dla wszystkich (read-only)

**Kryteria akceptacji:**

- ✓ RLS włączone na: accounts, categories, transactions
- ✓ Testy weryfikujące brak dostępu do cudzych danych
- ✓ Polityki RLS pokrywają wszystkie operacje: SELECT, INSERT, UPDATE, DELETE


### 6.2 Walidacja danych

**REQ-SEC-002: Constraints bazodanowe**

- Kod waluty: regex `^[A-Z]{3}$`
- Nazwa konta/kategorii: nie może być pusta `LENGTH(TRIM(name)) > 0`
- Kwota transakcji: w zakresie -9999999999.99 do 9999999999.99
- parent_id kategorii: >= 0
- Kategoria nie może być własnym rodzicem: `id != parent_id`

***

## 7. Wymagania wydajnościowe

### 7.1 Performance targets

**REQ-PERF-001: Czas odpowiedzi**

- SELECT pojedynczej transakcji: < 10ms
- SELECT listy transakcji (50 rekordów): < 50ms
- Obliczenie salda konta: < 100ms
- INSERT/UPDATE transakcji: < 50ms

**REQ-PERF-002: Skalowalność**

- System musi obsługiwać 10,000 aktywnych użytkowników
- Maksymalnie 1,000,000 transakcji w systemie bez degradacji
- Concurrent users: 100 użytkowników jednocześnie


### 7.2 Optymalizacje

**REQ-PERF-003: Strategia obliczania salda**

- Saldo NIE jest denormalizowane w tabeli accounts[^16][^17]
- Obliczane on-demand w kodzie aplikacji lub przez funkcję SQL
- Cache w warstwie aplikacyjnej (opcjonalnie)
- Uzasadnienie: Eliminuje problemy synchronizacji przy zmianach transakcji

**REQ-PERF-004: Indeksy warunkowe**

- Wykorzystanie partial indexes z warunkiem `WHERE active = true`
- Zmniejsza rozmiar indeksów o ~20-40% w aplikacjach z dużą ilością usuniętych rekordów[^12]

***

## 8. Logika biznesowa w bazie danych

### 8.1 Funkcje

**REQ-FUNC-001: Funkcja calculate_account_balance**

```sql
calculate_account_balance(p_account_id BIGINT, p_user_id UUID) 
RETURNS DECIMAL(12,2)
```

- Zwraca sumę wszystkich aktywnych transakcji dla danego konta
- Używana w widokach lub jako fallback w aplikacji

**REQ-FUNC-002: Funkcja update_updated_at_column**

- Automatycznie aktualizuje pole updated_at przy każdym UPDATE
- Trigger na wszystkich tabelach


### 8.2 Triggery

**REQ-TRIG-001: Walidacja hierarchii kategorii**

- Trigger: `trigger_validate_category_depth`
- Funkcja: `validate_category_depth()`
- Wykonywany: BEFORE INSERT OR UPDATE na categories
- Logika:
    - Jeśli parent_id > 0: sprawdź czy rodzic istnieje
    - Jeśli parent_id > 0: sprawdź czy rodzic nie jest już podkategorią
    - Zablokuj operację jeśli naruszenie hierarchii

**REQ-TRIG-002: Auto-update timestamps**

- Trigger na każdej tabeli aktualizujący updated_at

***

## 9. Widoki

**REQ-VIEW-001: view_accounts_with_balance**

```sql
CREATE VIEW view_accounts_with_balance AS
SELECT 
    a.id,
    a.user_id,
    a.name,
    c.code AS currency_code,
    c.description AS currency_description,
    a.tag,
    calculate_account_balance(a.id, a.user_id) AS balance,
    a.active,
    a.created_at,
    a.updated_at
FROM accounts a
JOIN currencies c ON a.currency_id = c.id
WHERE a.active = true;
```

**Cel:** Uproszczenie zapytań w UI - jedno zapytanie zamiast agregacji w aplikacji

***

## 10. Dane startowe

**REQ-DATA-001: Predefiniowane waluty**

```sql
INSERT INTO currencies (code, description) VALUES 
    ('PLN', 'Polski Złoty'),
    ('EUR', 'Euro'),
    ('USD', 'US Dollar'),
    ('GBP', 'British Pound'),
    ('CHF', 'Swiss Franc'),
    ('CZK', 'Czech Koruna');
```


***

## 11. Strategia soft delete

### 11.1 Założenia

**REQ-DEL-001: Soft delete bez triggerów**

- Usuwanie przez zmianę flagi `active = false`
- Implementacja w kodzie aplikacji, NIE w bazie danych
- Kaskadowe oznaczanie:
    - Usunięcie konta → wszystkie powiązane transakcje
    - Usunięcie kategorii → wszystkie powiązane transakcje
    - Waluty NIE mogą być usuwane

**REQ-DEL-002: Wpływ na obliczenia**

- Usunięte transakcje (active=false) NIE wpływają na saldo konta
- Wszystkie zapytania agregujące filtrują po `active = true`

***

## 12. Migracje i deployment

### 12.1 Deployment plan

**Faza 1: Setup infrastruktury**

1. Utworzenie tabel (w kolejności: currencies → accounts, categories → transactions)
2. Utworzenie indeksów podstawowych
3. Utworzenie indeksów złożonych

**Faza 2: Logika biznesowa**
4. Utworzenie funkcji pomocniczych
5. Utworzenie triggerów
6. Włączenie RLS i utworzenie polityk

**Faza 3: Helpers**
7. Utworzenie widoków
8. Wstawienie danych startowych (waluty)

**Faza 4: Weryfikacja**
9. Uruchomienie testów weryfikacyjnych
10. Performance testing

### 12.2 Rollback strategy

- Każdy krok migracji w osobnej transakcji
- Skrypty rollback dla każdej fazy
- Backup bazy przed deployment

***

## 13. Monitoring i maintenance

### 13.1 Metryki do monitorowania

**REQ-MON-001: Performance metrics**

- Średni czas wykonania zapytań na tabelę transactions
- Rozmiar indeksów vs rozmiar tabel
- Cache hit ratio dla indeksów
- Liczba sequential scans (powinno być ~0)

**REQ-MON-002: Business metrics**

- Liczba aktywnych użytkowników
- Średnia liczba transakcji na użytkownika
- Stosunek aktywnych do nieaktywnych rekordów


### 13.2 Maintenance tasks

- **Weekly**: ANALYZE na wszystkich tabelach
- **Monthly**: VACUUM ANALYZE, sprawdzenie rozmiaru indeksów
- **Quarterly**: Przegląd partial indexes vs full indexes
- **On-demand**: REINDEX przy degradacji performance

***

## 14. Constrainty i ograniczenia

### 14.1 Techniczne constraints

- **Brak FK do auth.users**: user_id to UUID bez foreign key constraint (Supabase limitation)[^18][^10]
- **Brak kaskadowego delete**: Obsługa w kodzie aplikacji zamiast triggerów
- **Brak FK na parent_id w categories**: parent_id=0 nie istnieje w tabeli


### 14.2 Założenia biznesowe

- Jeden użytkownik = jedna przestrzeń danych (brak współdzielenia)
- Transakcje są immutable po utworzeniu (edit = soft delete + nowy rekord - opcjonalnie)
- Waluty są statyczne (brak dynamicznego dodawania)
- Hierarchia kategorii max 2 poziomy

***

## 15. Kryteria akceptacji projektu

### 15.1 Funkcjonalne

- ✓ Wszystkie tabele utworzone zgodnie ze schematem
- ✓ Wszystkie indeksy działają poprawnie
- ✓ RLS zapewnia izolację danych między użytkownikami
- ✓ Triggery walidują hierarchię kategorii
- ✓ Funkcja calculate_account_balance zwraca poprawne wartości
- ✓ Dane startowe (waluty) załadowane


### 15.2 Wydajnościowe

- ✓ Zapytania o listę transakcji (50 rekordów) < 50ms
- ✓ Obliczenie salda < 100ms dla konta z 1000 transakcji
- ✓ Indeksy wykorzystane w > 95% zapytań (brak seq scans)


### 15.3 Bezpieczeństwo

- ✓ Testy RLS potwierdzają brak dostępu do cudzych danych
- ✓ Wszystkie constraints bazodanowe działają
- ✓ Trigger blokuje niepoprawną hierarchię kategorii

***

## 16. Ryzyka i mitigation

### 16.1 Ryzyka techniczne

**Ryzyko 1: Degradacja performance przy wzroście danych**

- Mitigation: Monitoring rozmiaru indeksów, partycjonowanie transactions po dacie (future)
- Prawdopodobieństwo: średnie
- Impact: wysoki

**Ryzyko 2: Problemy z obliczaniem salda on-the-fly**

- Mitigation: Cache w warstwie aplikacyjnej, materialized views (future)
- Prawdopodobieństwo: niskie
- Impact: średni

**Ryzyko 3: Brak kaskadowego delete prowadzi do inconsistency**

- Mitigation: Testy E2E, transaction wrapping w kodzie
- Prawdopodobieństwo: średnie
- Impact: średni


### 16.2 Ryzyka biznesowe

**Ryzyko 4: Zmiana wymagań dot. współdzielenia danych**

- Mitigation: Architektura umożliwia rozszerzenie o sharing (tabela permissions)
- Prawdopodobieństwo: wysokie
- Impact: wysoki

***

## 17. Future enhancements (poza MVP)

- **Wielowalutowe przeliczanie**: Automatyczne przeliczanie do głównej waluty użytkownika
- **Budżety**: Tabela budgets z limitami per kategoria
- **Cykliczne transakcje**: Tabela recurring_transactions
- **Współdzielenie kont**: Multi-user access per account
- **Audit log**: Historia zmian w transakcjach
- **Partycjonowanie**: Partition transactions po miesiącach dla lepszej skalowalności
- **Materialized views**: Cache agregacji dla dashboardów

***

## 18. Dokumentacja techniczna

### 18.1 Dostępne skrypty

- `01_create_tables.sql` - Utworzenie struktury tabel
- `02_create_indexes.sql` - Utworzenie indeksów
- `03_create_functions.sql` - Funkcje pomocnicze
- `04_create_triggers.sql` - Triggery
- `05_enable_rls.sql` - Row Level Security
- `06_create_views.sql` - Widoki
- `07_seed_data.sql` - Dane startowe
- `99_verify_installation.sql` - Weryfikacja instalacji


### 18.2 Diagram ERD

```
┌─────────────┐
│ currencies  │
│─────────────│
│ id (PK)     │◄────┐
│ code        │     │
│ description │     │
│ active      │     │
└─────────────┘     │
                    │
      ┌─────────────┼─────────────┐
      │             │             │
      │             │             │
┌─────▼──────┐  ┌──▼──────────┐  │
│ accounts   │  │transactions │  │
│────────────│  │─────────────│  │
│ id (PK)    │◄─┤ id (PK)     │  │
│ user_id    │  │ user_id     │  │
│ name       │  │ trans_date  │  │
│currency_id │  │ account_id  │  │
│ active     │  │ category_id │  │
└────────────┘  │ amount      │  │
                │currency_id  │──┘
┌─────────────┐ │ comment     │
│ categories  │ │ active      │
│─────────────│ └─────────────┘
│ id (PK)     │◄────┘
│ user_id     │
│ name        │
│ parent_id   │──┐
│ active      │  │
└─────────────┘  │
      ▲          │
      └──────────┘
```


***

## 19. Kontakt i odpowiedzialność

**Database Owner**: Backend Team Lead
**Security Review**: Security Team
**Performance Review**: DBA Team
**Business Review**: Product Owner

***

## 20. Historia zmian dokumentu

| Wersja | Data | Autor | Zmiany |
| :-- | :-- | :-- | :-- |
| 1.0 | 2025-10-02 | Backend Architect | Initial version - kompletna struktura bazy |


***

**Status dokumentu**: ✅ **Approved for Implementation**

**Next steps**:

1. Review przez Security Team
2. Deployment na staging environment
3. Performance testing
4. Production deployment
<span style="display:none">[^2][^3][^5][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://www.linkedin.com/pulse/product-requirement-document-build-money-manager-kartik-madnani

[^2]: https://www.reddit.com/r/ProductManagement/comments/95w0rl/a_sample_prd_product_requirements_document_i_made/

[^3]: https://assets.nextleap.app/submissions/DailyDairyExpenseTracker-PRDbySaiPhaneendra-f799b95a-842e-4765-9c6f-e36bfb074b26.pdf

[^4]: https://www.scribd.com/document/813359978/Accounting-Software-PRD

[^5]: https://chisellabs.com/blog/product-requirement-document-prd-templates/

[^6]: https://www.jamasoftware.com/requirements-management-guide/writing-requirements/how-to-write-an-effective-product-requirements-document/

[^7]: https://www.airtable.com/articles/product-requirements-document

[^8]: https://www.notion.com/blog/how-to-write-a-prd

[^9]: https://www.perforce.com/blog/alm/how-write-product-requirements-document-prd

[^10]: https://supabase.com/docs/guides/auth/managing-user-data

[^11]: https://supabase.com/docs/guides/auth

[^12]: https://www.percona.com/blog/benchmarking-postgresql-the-hidden-cost-of-over-indexing/

[^13]: https://www.cybertec-postgresql.com/en/uuid-serial-or-identity-columns-for-postgresql-auto-generated-primary-keys/

[^14]: https://www.reddit.com/r/PostgreSQL/comments/1gqip6o/serial_vs_uuid_best_practices_for_primary_keys_in/

[^15]: https://stackoverflow.com/questions/77411345/does-using-the-uuid-postgresql-data-type-solve-performance-issues

[^16]: https://l-lin.github.io/database/when-to-denormalize-a-database

[^17]: https://www.tigerdata.com/blog/counter-analytics-in-postgresql-beyond-simple-data-denormalization

[^18]: https://www.reddit.com/r/Supabase/comments/1jvw425/best_practice_for_referencing_users_authuser/


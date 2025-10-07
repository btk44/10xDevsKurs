<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Product Requirements Document (PRD)

## Database - Expense Tracking Application MVP


***

## 1. Executive Summary

### 1.1 Document Purpose

This document defines detailed requirements for the database layer of an expense tracking application designed for managing family expenses and income.[^1][^4]

### 1.2 Product

Database system based on PostgreSQL in Supabase, designed to support a multi-user web application for tracking financial transactions with complete data isolation between users.[^10][^11]

### 1.3 Key Assumptions

- Backend: Supabase (PostgreSQL)
- Frontend: Astro v5.5.5 + React v19.0.0 + TypeScript v5
- Architecture: Multi-tenant with data isolation per user_id
- Strategy: Soft delete, balance calculation in application code

***

## 2. Product Goals

### 2.1 Business Goals

- Enable families to effectively track expenses and income
- Provide simple, intuitive data structure without excessive complexity
- Achieve response time < 200ms for typical operations


### 2.2 Technical Goals

- Ensure complete data isolation between users
- Optimize query performance through strategic indexes[^12][^13]
- Enable easy scaling with growing number of users
- Ensure data integrity without complex triggers

***

## 4. Functional Requirements

### 4.1 Currency Management

**REQ-DB-001: Currency Storage**

- System must store predefined list of currencies
- Each currency contains: ISO 4217 code (3 characters), description, active flag
- Currencies are global for all users
- Currencies cannot be deleted (no soft delete)

**Acceptance Criteria:**

- ✓ Currency code must be unique and in XXX format (uppercase)
- ✓ Read-only access for users through RLS
- ✓ Predefined currencies: PLN, EUR, USD, GBP, CHF, CZK


### 4.2 Account Management

**REQ-DB-002: User Accounts**

- System must allow creating, editing and deleting financial accounts
- Each account contains: name, currency, optional tag (max 10 characters), active flag
- Accounts are isolated per user_id
- Balance is NOT cached in table - calculated on-demand

**Acceptance Criteria:**

- ✓ Account name cannot be empty
- ✓ Each account must have assigned currency
- ✓ User sees only own accounts (RLS)
- ✓ Soft delete through active flag


### 4.3 Category Management

**REQ-DB-003: Expense and Income Categories**

- System must support category hierarchy (max 2 levels)
- Main category: parent_id = 0
- Subcategory: parent_id > 0 (points to main category)
- Subcategories cannot have their own children

**Acceptance Criteria:**

- ✓ parent_id = 0 means main category
- ✓ Maximum 2-level hierarchy (validated by trigger)
- ✓ Category name cannot be empty
- ✓ User sees only own categories (RLS)
- ✓ Soft delete through active flag
- ✓ Parent existence validation when creating subcategory


### 4.4 Transaction Management

**REQ-DB-004: Financial Transactions**

- System must store all user transactions
- Transaction contains: date with time, account, category, amount, currency, comment
- Amount can be negative (expense), zero or positive (income)
- Date stored with time (TIMESTAMPTZ), displayed as date only in UI

**Acceptance Criteria:**

- ✓ Amount in range -9999999999.99 to 9999999999.99
- ✓ Zero amount is allowed
- ✓ Each transaction must have account, category and currency
- ✓ Comment is optional
- ✓ User sees only own transactions (RLS)
- ✓ Soft delete through active flag

***

## 5. Database Architecture

### 5.1 Table Schema

**Table: currencies**

```
- id (SERIAL) PK
- code (VARCHAR(3)) UNIQUE NOT NULL
- description (VARCHAR(100)) NOT NULL
- active (BOOLEAN) DEFAULT true
- created_at (TIMESTAMPTZ) DEFAULT NOW()
- updated_at (TIMESTAMPTZ) DEFAULT NOW()
```

**Table: accounts**

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

**Table: categories**

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

**Table: transactions**

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


### 5.2 Relations

```
currencies (1) ----< (N) accounts
currencies (1) ----< (N) transactions
accounts (1) ----< (N) transactions
categories (1) ----< (N) transactions
categories (1) ----< (N) categories (self-reference, parent_id)
```


### 5.3 Keys and Indexes

**REQ-DB-005: Primary Key Strategy**

- All tables use numerical auto-increment keys (SERIAL/BIGSERIAL)
- Rationale: Better index performance ~50% vs UUID, smaller space usage[^13][^14][^15]

**REQ-DB-006: Basic Indexes**

```sql
-- User isolation
idx_accounts_user_active (user_id, active) WHERE active = true
idx_categories_user_active (user_id, active) WHERE active = true
idx_transactions_user_active (user_id, active) WHERE active = true

-- Foreign keys
idx_transactions_account (account_id) WHERE active = true
idx_transactions_category (category_id) WHERE active = true
idx_transactions_currency (currency_id)
idx_accounts_currency (currency_id)

-- Filtering
idx_transactions_date (transaction_date DESC) WHERE active = true
idx_categories_main (user_id) WHERE parent_id = 0 AND active = true
idx_categories_parent (parent_id, user_id) WHERE parent_id > 0 AND active = true
```

**REQ-DB-007: Composite Indexes**

```sql
-- Balance calculation
idx_transactions_balance (user_id, account_id, active) WHERE active = true

-- Transaction list
idx_transactions_user_date (user_id, transaction_date DESC) WHERE active = true

-- Spending analysis
idx_transactions_category_spending (category_id, transaction_date, amount) WHERE active = true
```


***

## 6. Security Requirements

### 6.1 Row Level Security (RLS)

**REQ-SEC-001: User Data Isolation**

- All tables with user_id must have RLS enabled[^11][^10]
- Policy: user sees only records where `auth.uid() = user_id`
- Exception: currencies table available to all (read-only)

**Acceptance Criteria:**

- ✓ RLS enabled on: accounts, categories, transactions
- ✓ Tests verifying no access to other users' data
- ✓ RLS policies cover all operations: SELECT, INSERT, UPDATE, DELETE


### 6.2 Data Validation

**REQ-SEC-002: Database Constraints**

- Currency code: regex `^[A-Z]{3}$`
- Account/category name: cannot be empty `LENGTH(TRIM(name)) > 0`
- Transaction amount: in range -9999999999.99 to 9999999999.99
- Category parent_id: >= 0
- Category cannot be its own parent: `id != parent_id`

***

## 7. Performance Requirements

### 7.1 Performance Targets

**REQ-PERF-001: Response Time**

- SELECT single transaction: < 10ms
- SELECT transaction list (50 records): < 50ms
- Account balance calculation: < 100ms
- INSERT/UPDATE transaction: < 50ms

**REQ-PERF-002: Scalability**

- System must handle 10,000 active users
- Maximum 1,000,000 transactions in system without degradation
- Concurrent users: 100 users simultaneously


### 7.2 Optimizations

**REQ-PERF-003: Balance Calculation Strategy**

- Balance is NOT denormalized in accounts table[^16][^17]
- Calculated on-demand in application code or through SQL function
- Cache in application layer (optionally)
- Rationale: Eliminates synchronization problems when transactions change

**REQ-PERF-004: Conditional Indexes**

- Use partial indexes with condition `WHERE active = true`
- Reduces index size by ~20-40% in applications with many deleted records[^12]

***

## 8. Business Logic in Database

### 8.1 Functions

**REQ-FUNC-001: calculate_account_balance Function**

```sql
calculate_account_balance(p_account_id BIGINT, p_user_id UUID) 
RETURNS DECIMAL(12,2)
```

- Returns sum of all active transactions for given account
- Used in views or as fallback in application

**REQ-FUNC-002: update_updated_at_column Function**

- Automatically updates updated_at field on every UPDATE
- Trigger on all tables


### 8.2 Triggers

**REQ-TRIG-001: Category Hierarchy Validation**

- Trigger: `trigger_validate_category_depth`
- Function: `validate_category_depth()`
- Executed: BEFORE INSERT OR UPDATE on categories
- Logic:
    - If parent_id > 0: check if parent exists
    - If parent_id > 0: check if parent is not already a subcategory
    - Block operation if hierarchy violation

**REQ-TRIG-002: Auto-update Timestamps**

- Trigger on each table updating updated_at

***

## 9. Views

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

**Purpose:** Simplify UI queries - one query instead of aggregation in application

***

## 10. Seed Data

**REQ-DATA-001: Predefined Currencies**

```sql
INSERT INTO currencies (code, description) VALUES 
    ('PLN', 'Polish Zloty'),
    ('EUR', 'Euro'),
    ('USD', 'US Dollar'),
    ('GBP', 'British Pound'),
    ('CHF', 'Swiss Franc'),
    ('CZK', 'Czech Koruna');
```


***

## 11. Soft Delete Strategy

### 11.1 Assumptions

**REQ-DEL-001: Soft Delete Without Triggers**

- Deletion by changing `active = false` flag
- Implementation in application code, NOT in database
- Cascading marking:
    - Account deletion → all related transactions
    - Category deletion → all related transactions
    - Currencies CANNOT be deleted

**REQ-DEL-002: Impact on Calculations**

- Deleted transactions (active=false) do NOT affect account balance
- All aggregating queries filter by `active = true`

***

## 12. Migrations and Deployment

### 12.1 Deployment Plan

**Phase 1: Infrastructure Setup**

1. Create tables (in order: currencies → accounts, categories → transactions)
2. Create basic indexes
3. Create composite indexes

**Phase 2: Business Logic**
4. Create helper functions
5. Create triggers
6. Enable RLS and create policies

**Phase 3: Helpers**
7. Create views
8. Insert seed data (currencies)

**Phase 4: Verification**
9. Run verification tests
10. Performance testing

### 12.2 Rollback Strategy

- Each migration step in separate transaction
- Rollback scripts for each phase
- Database backup before deployment

***

## 13. Monitoring and Maintenance

### 13.1 Monitoring Metrics

**REQ-MON-001: Performance Metrics**

- Average query execution time on transactions table
- Index size vs table size
- Cache hit ratio for indexes
- Number of sequential scans (should be ~0)

**REQ-MON-002: Business Metrics**

- Number of active users
- Average transactions per user
- Ratio of active to inactive records


### 13.2 Maintenance Tasks

- **Weekly**: ANALYZE on all tables
- **Monthly**: VACUUM ANALYZE, index size check
- **Quarterly**: Review partial indexes vs full indexes
- **On-demand**: REINDEX on performance degradation

***

## 14. Constraints and Limitations

### 14.1 Technical Constraints

- **No FK to auth.users**: user_id is UUID without foreign key constraint (Supabase limitation)[^18][^10]
- **No cascading delete**: Handling in application code instead of triggers
- **No FK on parent_id in categories**: parent_id=0 doesn't exist in table


### 14.2 Business Assumptions

- One user = one data space (no sharing)
- Transactions are immutable after creation (edit = soft delete + new record - optionally)
- Currencies are static (no dynamic addition)
- Category hierarchy max 2 levels

***

## 15. Project Acceptance Criteria

### 15.1 Functional

- ✓ All tables created according to schema
- ✓ All indexes working correctly
- ✓ RLS ensures data isolation between users
- ✓ Triggers validate category hierarchy
- ✓ calculate_account_balance function returns correct values
- ✓ Seed data (currencies) loaded


### 15.2 Performance

- ✓ Transaction list queries (50 records) < 50ms
- ✓ Balance calculation < 100ms for account with 1000 transactions
- ✓ Indexes used in > 95% of queries (no seq scans)


### 15.3 Security

- ✓ RLS tests confirm no access to other users' data
- ✓ All database constraints working
- ✓ Trigger blocks incorrect category hierarchy

***

## 16. Risks and Mitigation

### 16.1 Technical Risks

**Risk 1: Performance degradation with data growth**

- Mitigation: Index size monitoring, transactions partitioning by date (future)
- Probability: medium
- Impact: high

**Risk 2: Problems with on-the-fly balance calculation**

- Mitigation: Application layer cache, materialized views (future)
- Probability: low
- Impact: medium

**Risk 3: Lack of cascading delete leads to inconsistency**

- Mitigation: E2E tests, transaction wrapping in code
- Probability: medium
- Impact: medium


### 16.2 Business Risks

**Risk 4: Requirements change regarding data sharing**

- Mitigation: Architecture allows extension with sharing (permissions table)
- Probability: high
- Impact: high

***

## 17. Future Enhancements (beyond MVP)

- **Multi-currency conversion**: Automatic conversion to user's main currency
- **Budgets**: Budgets table with limits per category
- **Recurring transactions**: recurring_transactions table
- **Account sharing**: Multi-user access per account
- **Audit log**: Transaction change history
- **Partitioning**: Partition transactions by months for better scalability
- **Materialized views**: Aggregation cache for dashboards

***

## 18. Technical Documentation

### 18.1 Available Scripts

- `01_create_tables.sql` - Create table structure
- `02_create_indexes.sql` - Create indexes
- `03_create_functions.sql` - Helper functions
- `04_create_triggers.sql` - Triggers
- `05_enable_rls.sql` - Row Level Security
- `06_create_views.sql` - Views
- `07_seed_data.sql` - Seed data
- `99_verify_installation.sql` - Installation verification


### 18.2 ERD Diagram

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

## 19. Contact and Responsibility

**Database Owner**: Backend Team Lead
**Security Review**: Security Team
**Performance Review**: DBA Team
**Business Review**: Product Owner

***

## 20. Document History

| Version | Date | Author | Changes |
| :-- | :-- | :-- | :-- |
| 1.0 | 2025-10-02 | Backend Architect | Initial version - complete database structure |


***

**Document Status**: ✅ **Approved for Implementation**

**Next steps**:

1. Security Team review
2. Staging environment deployment
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


# Product Requirements Document (PRD)

## Database - Expense Tracking Application MVP


***

## 1. Executive Summary

### 1.1 Document Purpose

This document defines detailed requirements for the database layer of an expense tracking application designed for managing family expenses and income.

### 1.2 Product

Database system based on PostgreSQL in Supabase, designed to support a multi-user web application for tracking financial transactions with complete data isolation between users.

### 1.3 Key Assumptions

- Backend: Supabase (PostgreSQL)
- Frontend: Astro v5.5.5 + React v19.0.0 + TypeScript v5
- Architecture: Multi-tenant with data isolation per user_id
- Strategy: Soft delete, balance calculation using category type
- Category type determines transaction classification (income/expense)

***

## 2. Product Goals

### 2.1 Business Goals

- Enable families to effectively track expenses and income
- Provide simple, intuitive data structure without excessive complexity
- Achieve response time < 200ms for typical operations
- Support monthly financial summaries with category aggregations


### 2.2 Technical Goals

- Ensure complete data isolation between users
- Optimize query performance through strategic indexes
- Enable easy scaling with growing number of users
- Ensure data integrity without complex triggers
- Support hierarchical category summations

***

## 3. Change Log from Previous Version

### 3.1 Major Changes

**Change 1: Transaction Amount Validation**
- Transaction amounts must now be positive values > 0
- Previous: allowed negative, zero, and positive values
- Impact: Transaction type is derived from category type instead of amount sign

**Change 2: Category Type System**
- Added category_type ENUM field ('income', 'expense')
- Category type is inherited by child categories from parent
- Default type: 'expense'
- Impact: All transaction calculations now based on category type

**Change 3: Monthly Category Summary**
- New database view: view_category_monthly_summary
- Provides hierarchical summation of transactions for current month
- Aggregates subcategory amounts into parent categories
- Impact: New performance considerations for monthly reporting

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
- Balance is NOT cached in table - calculated on-demand using category types

**Acceptance Criteria:**

- ✓ Account name cannot be empty
- ✓ Each account must have assigned currency
- ✓ User sees only own accounts (RLS)
- ✓ Soft delete through active flag


### 4.3 Category Management

**REQ-DB-003: Expense and Income Categories**

- System must support category hierarchy (max 2 levels)
- Each category has a type: 'income' or 'expense' (ENUM)
- Main category: parent_id = 0
- Subcategory: parent_id > 0 (points to main category)
- Subcategories inherit type from parent category
- Subcategories cannot have their own children

**Acceptance Criteria:**

- ✓ parent_id = 0 means main category
- ✓ Maximum 2-level hierarchy (validated by trigger)
- ✓ Category name cannot be empty
- ✓ Category type defaults to 'expense'
- ✓ Subcategory type must match parent category type (validated by trigger)
- ✓ User sees only own categories (RLS)
- ✓ Soft delete through active flag
- ✓ Parent existence validation when creating subcategory
- ✓ Changing parent category type cascades to all child categories


### 4.4 Transaction Management

**REQ-DB-004: Financial Transactions**

- System must store all user transactions
- Transaction contains: date with time, account, category, amount, currency, comment
- **Amount must be positive value greater than 0**
- Transaction type (income/expense) is always derived from category type
- Date stored with time (TIMESTAMPTZ), displayed as date only in UI

**Acceptance Criteria:**

- ✓ Amount must be > 0 (constraint: amount > 0)
- ✓ Amount in range 0.01 to 9999999999.99
- ✓ Zero and negative amounts are NOT allowed
- ✓ Each transaction must have account, category and currency
- ✓ Comment is optional
- ✓ Transaction type derived from category at query time, not stored
- ✓ User sees only own transactions (RLS)
- ✓ Soft delete through active flag


### 4.5 Monthly Category Summary

**REQ-DB-005: Category Aggregation View**

- System must provide monthly transaction summaries by category
- Summary includes hierarchical aggregation (subcategories rolled into parents)
- Current month determined by server time (CURRENT_DATE)
- Separate totals for income and expense categories

**Acceptance Criteria:**

- ✓ View returns categories with transaction sums for current calendar month
- ✓ Subcategory amounts are included in parent category totals
- ✓ Only active categories and transactions included
- ✓ User sees only own data (RLS through underlying tables)
- ✓ Performance target: < 150ms for user with 500 transactions/month

***

## 5. Database Architecture

### 5.1 Table Schema

**Table: currencies**

```sql
- id (SERIAL) PK
- code (VARCHAR(3)) UNIQUE NOT NULL
- description (VARCHAR(100)) NOT NULL
- active (BOOLEAN) DEFAULT true
- created_at (TIMESTAMPTZ) DEFAULT NOW()
- updated_at (TIMESTAMPTZ) DEFAULT NOW()
```

**Table: accounts**

```sql
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

```sql
- id (BIGSERIAL) PK
- user_id (UUID) NOT NULL
- name (VARCHAR(100)) NOT NULL
- category_type (category_type_enum) DEFAULT 'expense' NOT NULL
- parent_id (BIGINT) DEFAULT 0 NOT NULL
- tag (VARCHAR(10))
- active (BOOLEAN) DEFAULT true
- created_at (TIMESTAMPTZ) DEFAULT NOW()
- updated_at (TIMESTAMPTZ) DEFAULT NOW()

-- ENUM type definition
CREATE TYPE category_type_enum AS ENUM ('income', 'expense');
```

**Table: transactions**

```sql
- id (BIGSERIAL) PK
- user_id (UUID) NOT NULL
- transaction_date (TIMESTAMPTZ) NOT NULL
- account_id (BIGINT) FK -> accounts.id
- category_id (BIGINT) FK -> categories.id
- amount (DECIMAL(12,2)) NOT NULL CHECK (amount > 0)
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

**REQ-DB-006: Primary Key Strategy**

- All tables use numerical auto-increment keys (SERIAL/BIGSERIAL)
- Rationale: Better index performance ~50% vs UUID, smaller space usage

**REQ-DB-007: Basic Indexes**

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

-- Category type filtering
idx_categories_type (user_id, category_type) WHERE active = true
```

**REQ-DB-008: Composite Indexes**

```sql
-- Balance calculation with category type
idx_transactions_balance (user_id, account_id, active) WHERE active = true

-- Transaction list
idx_transactions_user_date (user_id, transaction_date DESC) WHERE active = true

-- Monthly category analysis
idx_transactions_category_month (category_id, transaction_date, amount) WHERE active = true

-- Monthly summary optimization
idx_transactions_monthly (user_id, transaction_date, category_id) 
    WHERE active = true AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE)
```


***

## 6. Security Requirements

### 6.1 Row Level Security (RLS)

**REQ-SEC-001: User Data Isolation**

- All tables with user_id must have RLS enabled
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
- **Transaction amount: must be > 0 (CHECK constraint: amount > 0)**
- Transaction amount: maximum 9999999999.99
- Category parent_id: >= 0
- Category cannot be its own parent: `id != parent_id`
- **Category type: must be 'income' or 'expense' (ENUM enforcement)**
- **Subcategory type must match parent type (trigger validation)**

***

## 7. Performance Requirements

### 7.1 Performance Targets

**REQ-PERF-001: Response Time**

- SELECT single transaction: < 10ms
- SELECT transaction list (50 records): < 50ms
- Account balance calculation: < 100ms
- INSERT/UPDATE transaction: < 50ms
- **Monthly category summary view: < 150ms**

**REQ-PERF-002: Scalability**

- System must handle 10,000 active users
- Maximum 1,000,000 transactions in system without degradation
- Concurrent users: 100 users simultaneously


### 7.2 Optimizations

**REQ-PERF-003: Balance Calculation Strategy**

- Balance is NOT denormalized in accounts table
- **Calculated using category type: income adds, expense subtracts**
- Balance formula: SUM(CASE WHEN category_type = 'income' THEN amount ELSE -amount END)
- Cache in application layer (optionally)
- Rationale: Eliminates synchronization problems when transactions or category types change

**REQ-PERF-004: Conditional Indexes**

- Use partial indexes with condition `WHERE active = true`
- Reduces index size by ~20-40% in applications with many deleted records
- **Additional partial index for current month transactions**

***

## 8. Business Logic in Database

### 8.1 Functions

**REQ-FUNC-001: calculate_account_balance Function**

```sql
CREATE OR REPLACE FUNCTION calculate_account_balance(
    p_account_id BIGINT, 
    p_user_id UUID
) 
RETURNS DECIMAL(12,2)
LANGUAGE plpgsql
AS $$
DECLARE
    v_balance DECIMAL(12,2);
BEGIN
    SELECT COALESCE(
        SUM(
            CASE 
                WHEN c.category_type = 'income' THEN t.amount
                WHEN c.category_type = 'expense' THEN -t.amount
            END
        ), 
        0
    )
    INTO v_balance
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.account_id = p_account_id
        AND t.user_id = p_user_id
        AND t.active = true
        AND c.active = true;

    RETURN v_balance;
END;
$$;
```

- Returns sum of all active transactions for given account
- Uses category type to determine if amount is added or subtracted
- Used in views or as fallback in application

**REQ-FUNC-002: get_category_type Function**

```sql
CREATE OR REPLACE FUNCTION get_category_type(p_category_id BIGINT)
RETURNS category_type_enum
LANGUAGE plpgsql
AS $$
DECLARE
    v_type category_type_enum;
BEGIN
    SELECT category_type
    INTO v_type
    FROM categories
    WHERE id = p_category_id;

    RETURN v_type;
END;
$$;
```

- Returns category type for given category
- Helper function for application layer

**REQ-FUNC-003: update_updated_at_column Function**

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
    - **If parent_id > 0: validate category_type matches parent's category_type**
    - Block operation if hierarchy violation

```sql
CREATE OR REPLACE FUNCTION validate_category_depth()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_parent_depth INTEGER;
    v_parent_type category_type_enum;
BEGIN
    -- If this is a main category (parent_id = 0), allow
    IF NEW.parent_id = 0 THEN
        RETURN NEW;
    END IF;

    -- Check if parent exists and get its depth and type
    SELECT 
        CASE WHEN parent_id = 0 THEN 1 ELSE 2 END,
        category_type
    INTO v_parent_depth, v_parent_type
    FROM categories
    WHERE id = NEW.parent_id 
        AND user_id = NEW.user_id 
        AND active = true;

    -- Parent must exist
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parent category does not exist or is not active';
    END IF;

    -- Parent cannot be a subcategory (max 2 levels)
    IF v_parent_depth > 1 THEN
        RAISE EXCEPTION 'Maximum category depth is 2 levels';
    END IF;

    -- NEW: Validate type matches parent
    IF NEW.category_type != v_parent_type THEN
        RAISE EXCEPTION 'Subcategory type must match parent category type';
    END IF;

    RETURN NEW;
END;
$$;
```

**REQ-TRIG-002: Category Type Change Cascade**

- Trigger: `trigger_cascade_category_type`
- Function: `cascade_category_type_to_children()`
- Executed: AFTER UPDATE on categories
- Logic:
    - When parent category type changes
    - Update all child categories to match new type
    - Ensures type inheritance is maintained

```sql
CREATE OR REPLACE FUNCTION cascade_category_type_to_children()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- If category_type changed on a parent category
    IF OLD.category_type != NEW.category_type AND NEW.parent_id = 0 THEN
        -- Update all children to match new type
        UPDATE categories
        SET category_type = NEW.category_type,
            updated_at = NOW()
        WHERE parent_id = NEW.id
            AND user_id = NEW.user_id
            AND active = true;
    END IF;

    RETURN NEW;
END;
$$;
```

**REQ-TRIG-003: Auto-update Timestamps**

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

**Purpose:** Simplify UI queries - one query instead of aggregation in application. Balance calculation uses category type.


**REQ-VIEW-002: view_category_monthly_summary**

```sql
CREATE VIEW view_category_monthly_summary AS
WITH current_month_start AS (
    SELECT DATE_TRUNC('month', CURRENT_DATE)::DATE AS month_start
),
current_month_end AS (
    SELECT (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::DATE AS month_end
),
-- Get all transactions for current month with category info
monthly_transactions AS (
    SELECT 
        t.user_id,
        t.category_id,
        c.name AS category_name,
        c.category_type,
        c.parent_id,
        t.amount
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    CROSS JOIN current_month_start cms
    CROSS JOIN current_month_end cme
    WHERE t.active = true
        AND c.active = true
        AND t.transaction_date >= cms.month_start
        AND t.transaction_date < cme.month_end
),
-- Aggregate by subcategory
subcategory_sums AS (
    SELECT 
        user_id,
        category_id,
        category_name,
        category_type,
        parent_id,
        SUM(amount) AS total_amount,
        COUNT(*) AS transaction_count
    FROM monthly_transactions
    WHERE parent_id > 0
    GROUP BY user_id, category_id, category_name, category_type, parent_id
),
-- Aggregate by main category (including direct transactions)
main_category_direct AS (
    SELECT 
        user_id,
        category_id,
        category_name,
        category_type,
        parent_id,
        SUM(amount) AS total_amount,
        COUNT(*) AS transaction_count
    FROM monthly_transactions
    WHERE parent_id = 0
    GROUP BY user_id, category_id, category_name, category_type, parent_id
),
-- Roll up subcategory amounts to parents
parent_rollup AS (
    SELECT 
        s.user_id,
        s.parent_id AS category_id,
        SUM(s.total_amount) AS subcategory_total,
        SUM(s.transaction_count) AS subcategory_transaction_count
    FROM subcategory_sums s
    GROUP BY s.user_id, s.parent_id
)
-- Combine main categories with rolled-up subcategory totals
SELECT 
    COALESCE(m.user_id, p.user_id) AS user_id,
    COALESCE(m.category_id, p.category_id) AS category_id,
    m.category_name,
    m.category_type,
    m.parent_id,
    COALESCE(m.total_amount, 0) + COALESCE(p.subcategory_total, 0) AS total_amount,
    COALESCE(m.transaction_count, 0) + COALESCE(p.subcategory_transaction_count, 0) AS transaction_count,
    CURRENT_DATE AS report_date
FROM main_category_direct m
FULL OUTER JOIN parent_rollup p ON m.user_id = p.user_id AND m.category_id = p.category_id

UNION ALL

-- Include subcategories as separate rows
SELECT 
    user_id,
    category_id,
    category_name,
    category_type,
    parent_id,
    total_amount,
    transaction_count,
    CURRENT_DATE AS report_date
FROM subcategory_sums;
```

**Purpose:** 
- Provides monthly summary of transactions grouped by category
- Includes hierarchical summation (subcategory amounts rolled into parents)
- Shows both main categories with totals and individual subcategories
- Current month based on server time (CURRENT_DATE)
- Separated by category type (income/expense)

**Columns:**
- `user_id`: User identifier
- `category_id`: Category identifier
- `category_name`: Category name
- `category_type`: 'income' or 'expense'
- `parent_id`: 0 for main categories, parent_id for subcategories
- `total_amount`: Sum of transaction amounts (always positive)
- `transaction_count`: Number of transactions
- `report_date`: Current date when view was queried

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
    - **Category type change → automatic cascade to children (trigger)**
    - Currencies CANNOT be deleted

**REQ-DEL-002: Impact on Calculations**

- Deleted transactions (active=false) do NOT affect account balance
- Deleted categories (active=false) do NOT appear in monthly summaries
- All aggregating queries filter by `active = true`

***

## 12. Migrations and Deployment

### 12.1 Deployment Plan

**Phase 1: Infrastructure Setup**

1. Create ENUM types (category_type_enum)
2. Create tables (in order: currencies → accounts, categories → transactions)
3. Create basic indexes
4. Create composite indexes

**Phase 2: Business Logic**

4. Create helper functions (calculate_account_balance, get_category_type)
5. Create triggers (category validation, type cascade, timestamps)
6. Enable RLS and create policies

**Phase 3: Helpers**

7. Create views (accounts_with_balance, category_monthly_summary)
8. Insert seed data (currencies)

**Phase 4: Verification**

9. Run verification tests
10. Performance testing (especially monthly summary view)


### 12.2 Rollback Strategy

- Each migration step in separate transaction
- Rollback scripts for each phase
- Database backup before deployment
- Special attention to ENUM type changes (requires careful migration)

***

## 13. Monitoring and Maintenance

### 13.1 Monitoring Metrics

**REQ-MON-001: Performance Metrics**

- Average query execution time on transactions table
- **Monthly summary view execution time**
- Index size vs table size
- Cache hit ratio for indexes
- Number of sequential scans (should be ~0)

**REQ-MON-002: Business Metrics**

- Number of active users
- Average transactions per user
- Ratio of active to inactive records
- **Distribution of income vs expense categories**
- **Average monthly transaction count per user**


### 13.2 Maintenance Tasks

- **Weekly**: ANALYZE on all tables
- **Monthly**: VACUUM ANALYZE, index size check
- **Quarterly**: Review partial indexes vs full indexes, review monthly summary view performance
- **On-demand**: REINDEX on performance degradation

***

## 14. Constraints and Limitations

### 14.1 Technical Constraints

- **No FK to auth.users**: user_id is UUID without foreign key constraint (Supabase limitation)
- **No cascading delete**: Handling in application code instead of triggers
- **No FK on parent_id in categories**: parent_id=0 doesn't exist in table
- **ENUM changes require migration**: Adding new category types requires database migration


### 14.2 Business Assumptions

- One user = one data space (no sharing)
- Transactions are immutable after creation (edit = soft delete + new record - optionally)
- Currencies are static (no dynamic addition)
- Category hierarchy max 2 levels
- **Transaction amounts are always positive - type determined by category**
- **Category type changes affect all historical transactions**
- **Monthly summaries based on server time zone**

***

## 15. Project Acceptance Criteria

### 15.1 Functional

- ✓ All tables created according to schema
- ✓ **category_type_enum ENUM created and functioning**
- ✓ All indexes working correctly
- ✓ **Transaction amount constraint (> 0) enforced**
- ✓ RLS ensures data isolation between users
- ✓ Triggers validate category hierarchy and type inheritance
- ✓ **Category type cascade trigger updates children when parent type changes**
- ✓ calculate_account_balance function returns correct values using category type
- ✓ **view_category_monthly_summary returns hierarchical sums correctly**
- ✓ Seed data (currencies) loaded


### 15.2 Performance

- ✓ Transaction list queries (50 records) < 50ms
- ✓ Balance calculation < 100ms for account with 1000 transactions
- ✓ **Monthly category summary < 150ms for user with 500 transactions/month**
- ✓ Indexes used in > 95% of queries (no seq scans)


### 15.3 Security

- ✓ RLS tests confirm no access to other users' data
- ✓ All database constraints working
- ✓ Trigger blocks incorrect category hierarchy
- ✓ **Trigger blocks subcategory with different type than parent**
- ✓ **Transaction amount validation prevents zero or negative values**

***

## 16. Risks and Mitigation

### 16.1 Technical Risks

**Risk 1: Performance degradation with data growth**

- Mitigation: Index size monitoring, transactions partitioning by date (future), optimize monthly summary view
- Probability: medium
- Impact: high

**Risk 2: Monthly summary view performance issues**

- Mitigation: Partial index on current month, consider materialized view for dashboard
- Probability: medium
- Impact: medium

**Risk 3: Category type changes causing confusion**

- Mitigation: UI warnings when changing category type, audit log of type changes (future)
- Probability: high
- Impact: medium

**Risk 4: Lack of cascading delete leads to inconsistency**

- Mitigation: E2E tests, transaction wrapping in code
- Probability: medium
- Impact: medium


### 16.2 Business Risks

**Risk 5: Users accidentally change category type**

- Mitigation: Confirmation dialogs in UI, ability to undo type changes, audit trail
- Probability: high
- Impact: medium

**Risk 6: Requirements change regarding data sharing**

- Mitigation: Architecture allows extension with sharing (permissions table)
- Probability: high
- Impact: high

***

## 17. Future Enhancements (beyond MVP)

- **Multi-currency conversion**: Automatic conversion to user's main currency
- **Budgets**: Budgets table with limits per category and type
- **Recurring transactions**: recurring_transactions table
- **Account sharing**: Multi-user access per account
- **Audit log**: Transaction and category type change history
- **Partitioning**: Partition transactions by months for better scalability
- **Materialized views**: Cache monthly summary for faster dashboard loading
- **Historical type tracking**: Optional snapshot of category type at transaction time
- **Custom date ranges**: Summary views for arbitrary date ranges
- **Multi-level categories**: Support for more than 2 levels if needed

***

## 18. Technical Documentation

### 18.1 Available Scripts

- `01_create_enums.sql` - Create ENUM types
- `02_create_tables.sql` - Create table structure
- `03_create_indexes.sql` - Create indexes
- `04_create_functions.sql` - Helper functions
- `05_create_triggers.sql` - Triggers
- `06_enable_rls.sql` - Row Level Security
- `07_create_views.sql` - Views (including monthly summary)
- `08_seed_data.sql` - Seed data
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
└────────────┘  │ amount (+)  │  │
                │currency_id  │──┘
┌─────────────┐ │ comment     │
│ categories  │ │ active      │
│─────────────│ └─────────────┘
│ id (PK)     │◄────┘
│ user_id     │
│ name        │
│ type (ENUM) │
│ parent_id   │──┐
│ active      │  │
└─────────────┘  │
      ▲          │
      └──────────┘
```

**Key Changes in ERD:**
- categories now includes `type` field (ENUM)
- transactions.amount is marked as (+) indicating positive only
- Type flows from category to transaction logic

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
| 2.0 | 2025-10-07 | Backend Architect | Major update: Added category types, positive-only amounts, monthly summary view |


***

**Document Status**: ✅ **Approved for Review**

**Next steps**:

1. Architecture team review (focus on category type system)
2. Security team review (validation of new constraints)
3. Performance testing (especially monthly summary view)
4. Staging environment deployment
5. Production deployment


<div align="center">⁂</div>

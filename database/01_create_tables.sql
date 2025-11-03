-- =============================================================================
-- 01_create_tables.sql
-- Create all tables for the expense tracking application
-- Order: currencies → accounts, categories → transactions
-- =============================================================================

-- Enable UUID extension for user_id fields
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- Table: currencies
-- Global currency definitions (read-only for users)
-- =============================================================================
CREATE TABLE currencies (
    id SERIAL PRIMARY KEY,
    code VARCHAR(3) UNIQUE NOT NULL CHECK (code ~ '^[A-Z]{3}$'),
    description VARCHAR(100) NOT NULL CHECK (LENGTH(TRIM(description)) > 0),
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE currencies IS 'Global currency definitions - read-only for users';
COMMENT ON COLUMN currencies.code IS 'ISO 4217 currency code (3 uppercase letters)';
COMMENT ON COLUMN currencies.description IS 'Human-readable currency name';
COMMENT ON COLUMN currencies.active IS 'Currency availability flag';

-- =============================================================================
-- Table: accounts
-- User financial accounts (bank accounts, cash, credit cards, etc.)
-- =============================================================================
CREATE TABLE accounts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL CHECK (LENGTH(TRIM(name)) > 0),
    currency_id INTEGER NOT NULL REFERENCES currencies(id),
    tag VARCHAR(10),
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE accounts IS 'User financial accounts with currency assignment';
COMMENT ON COLUMN accounts.user_id IS 'Owner of the account (references auth.users)';
COMMENT ON COLUMN accounts.name IS 'Account display name';
COMMENT ON COLUMN accounts.currency_id IS 'Primary currency for this account';
COMMENT ON COLUMN accounts.tag IS 'Optional short tag for quick identification';
COMMENT ON COLUMN accounts.active IS 'Soft delete flag';

-- =============================================================================
-- Table: categories
-- Hierarchical expense/income categories (max 2 levels)
-- parent_id = 0 means main category
-- parent_id > 0 means subcategory
-- =============================================================================
CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL CHECK (LENGTH(TRIM(name)) > 0),
    parent_id BIGINT DEFAULT 0 NOT NULL CHECK (parent_id >= 0),
    tag VARCHAR(10),
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Prevent self-reference
    CONSTRAINT chk_category_not_self_parent CHECK (id != parent_id)
);

COMMENT ON TABLE categories IS 'Hierarchical categories for transactions (max 2 levels)';
COMMENT ON COLUMN categories.user_id IS 'Owner of the category (references auth.users)';
COMMENT ON COLUMN categories.name IS 'Category display name';
COMMENT ON COLUMN categories.parent_id IS '0 = main category, >0 = subcategory';
COMMENT ON COLUMN categories.tag IS 'Optional short tag for quick identification';
COMMENT ON COLUMN categories.active IS 'Soft delete flag';

-- =============================================================================
-- Table: transactions
-- All financial transactions (expenses and income)
-- Negative amount = expense, Positive amount = income, Zero = allowed
-- =============================================================================
CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    transaction_date TIMESTAMPTZ NOT NULL,
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    category_id BIGINT NOT NULL REFERENCES categories(id),
    amount DECIMAL(12,2) NOT NULL CHECK (amount >= -9999999999.99 AND amount <= 9999999999.99),
    currency_id INTEGER NOT NULL REFERENCES currencies(id),
    comment TEXT,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE transactions IS 'All financial transactions with full audit trail';
COMMENT ON COLUMN transactions.user_id IS 'Owner of the transaction (references auth.users)';
COMMENT ON COLUMN transactions.transaction_date IS 'When the transaction occurred';
COMMENT ON COLUMN transactions.account_id IS 'Source/destination account';
COMMENT ON COLUMN transactions.category_id IS 'Transaction category';
COMMENT ON COLUMN transactions.amount IS 'Transaction amount (negative=expense, positive=income)';
COMMENT ON COLUMN transactions.currency_id IS 'Transaction currency';
COMMENT ON COLUMN transactions.comment IS 'Optional description/notes';
COMMENT ON COLUMN transactions.active IS 'Soft delete flag';

-- =============================================================================
-- Table creation completed successfully
-- Next: Run 02_create_indexes.sql
-- =============================================================================

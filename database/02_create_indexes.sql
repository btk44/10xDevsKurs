-- =============================================================================
-- 02_create_indexes.sql
-- Create all indexes for optimal query performance
-- Order: Basic indexes → Foreign key indexes → Composite indexes
-- =============================================================================

-- =============================================================================
-- BASIC INDEXES - User isolation and active record filtering
-- =============================================================================

-- User isolation indexes with partial indexing for active records only
CREATE INDEX idx_accounts_user_active 
    ON accounts (user_id, active) 
    WHERE active = true;

CREATE INDEX idx_categories_user_active 
    ON categories (user_id, active) 
    WHERE active = true;

CREATE INDEX idx_transactions_user_active 
    ON transactions (user_id, active) 
    WHERE active = true;

-- =============================================================================
-- FOREIGN KEY INDEXES - Improve JOIN performance
-- =============================================================================

-- Transaction foreign keys (most frequently joined)
CREATE INDEX idx_transactions_account 
    ON transactions (account_id) 
    WHERE active = true;

CREATE INDEX idx_transactions_category 
    ON transactions (category_id) 
    WHERE active = true;

CREATE INDEX idx_transactions_currency 
    ON transactions (currency_id);

-- Account foreign keys
CREATE INDEX idx_accounts_currency 
    ON accounts (currency_id);

-- =============================================================================
-- FILTERING INDEXES - Common WHERE clause optimizations
-- =============================================================================

-- Transaction date filtering (most recent first)
CREATE INDEX idx_transactions_date 
    ON transactions (transaction_date DESC) 
    WHERE active = true;

-- Category hierarchy navigation
CREATE INDEX idx_categories_main 
    ON categories (user_id) 
    WHERE parent_id = 0 AND active = true;

CREATE INDEX idx_categories_parent 
    ON categories (parent_id, user_id) 
    WHERE parent_id > 0 AND active = true;

-- Currency code lookups (unique constraint already provides index, but explicit for clarity)
-- Note: UNIQUE constraint on currencies.code automatically creates an index

-- =============================================================================
-- COMPOSITE INDEXES - Complex query optimizations
-- =============================================================================

-- Balance calculation optimization
-- Most critical index for calculate_account_balance function
CREATE INDEX idx_transactions_balance 
    ON transactions (user_id, account_id, active) 
    WHERE active = true;

-- Transaction listing with date sorting
-- Optimizes: SELECT * FROM transactions WHERE user_id = ? ORDER BY transaction_date DESC
CREATE INDEX idx_transactions_user_date 
    ON transactions (user_id, transaction_date DESC) 
    WHERE active = true;

-- Category spending analysis
-- Optimizes: SELECT category_id, SUM(amount) FROM transactions WHERE category_id = ? AND transaction_date BETWEEN ? AND ?
CREATE INDEX idx_transactions_category_spending 
    ON transactions (category_id, transaction_date, amount) 
    WHERE active = true;

-- Account transaction history
-- Optimizes: SELECT * FROM transactions WHERE user_id = ? AND account_id = ? ORDER BY transaction_date DESC
CREATE INDEX idx_transactions_account_history 
    ON transactions (user_id, account_id, transaction_date DESC) 
    WHERE active = true;

-- Monthly/period analysis
-- Optimizes: SELECT * FROM transactions WHERE user_id = ? AND transaction_date >= ? AND transaction_date < ?
CREATE INDEX idx_transactions_user_period 
    ON transactions (user_id, transaction_date) 
    WHERE active = true;

-- =============================================================================
-- PERFORMANCE NOTES
-- =============================================================================

-- All indexes use partial indexing with "WHERE active = true" to:
-- 1. Reduce index size by ~20-40% in applications with soft deletes
-- 2. Improve query performance by excluding deleted records
-- 3. Reduce index maintenance overhead

-- Index size estimation (approximate):
-- - idx_transactions_user_active: High usage, medium size
-- - idx_transactions_balance: High usage, medium size  
-- - idx_transactions_user_date: High usage, large size
-- - idx_transactions_category_spending: Medium usage, large size
-- - Other indexes: Low-medium usage, small-medium size

-- =============================================================================
-- Index creation completed successfully
-- Next: Run 03_create_functions.sql
-- =============================================================================

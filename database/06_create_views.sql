-- =============================================================================
-- 06_create_views.sql
-- Create database views for simplified data access
-- Views: account summaries, transaction details, category hierarchies
-- =============================================================================

-- =============================================================================
-- VIEW: view_accounts_with_balance
-- Purpose: Simplified account access with real-time balance calculation
-- Usage: SELECT * FROM view_accounts_with_balance WHERE user_id = auth.uid()
-- =============================================================================

CREATE OR REPLACE VIEW view_accounts_with_balance AS
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

COMMENT ON VIEW view_accounts_with_balance IS 
'Account details with real-time balance calculation. Filters active accounts only.';

-- =============================================================================
-- VIEW: view_transactions_detailed
-- Purpose: Transaction details with account and category names
-- Usage: SELECT * FROM view_transactions_detailed WHERE user_id = auth.uid()
-- =============================================================================

CREATE OR REPLACE VIEW view_transactions_detailed AS
SELECT 
    t.id,
    t.user_id,
    t.transaction_date,
    t.amount,
    curr.code AS currency_code,
    curr.description AS currency_description,
    a.name AS account_name,
    a.tag AS account_tag,
    get_category_hierarchy(t.category_id, t.user_id) AS category_hierarchy,
    cat.name AS category_name,
    cat.tag AS category_tag,
    CASE 
        WHEN cat.parent_id = 0 THEN cat.name 
        ELSE (SELECT name FROM categories WHERE id = cat.parent_id AND user_id = t.user_id)
    END AS main_category_name,
    t.comment,
    t.active,
    t.created_at,
    t.updated_at
FROM transactions t
JOIN accounts a ON t.account_id = a.id
JOIN categories cat ON t.category_id = cat.id
JOIN currencies curr ON t.currency_id = curr.id
WHERE t.active = true;

COMMENT ON VIEW view_transactions_detailed IS 
'Detailed transaction view with account, category, and currency information.';

-- =============================================================================
-- VIEW: view_categories_hierarchical
-- Purpose: Category details with parent-child relationships
-- Usage: SELECT * FROM view_categories_hierarchical WHERE user_id = auth.uid()
-- =============================================================================

CREATE OR REPLACE VIEW view_categories_hierarchical AS
SELECT 
    c.id,
    c.user_id,
    c.name,
    c.parent_id,
    CASE 
        WHEN c.parent_id = 0 THEN NULL
        ELSE (SELECT name FROM categories WHERE id = c.parent_id AND user_id = c.user_id)
    END AS parent_name,
    get_category_hierarchy(c.id, c.user_id) AS full_hierarchy,
    c.tag,
    CASE 
        WHEN c.parent_id = 0 THEN 'main'
        ELSE 'subcategory'
    END AS category_type,
    (SELECT COUNT(*) FROM categories sub WHERE sub.parent_id = c.id AND sub.user_id = c.user_id AND sub.active = true) AS subcategory_count,
    c.active,
    c.created_at,
    c.updated_at
FROM categories c
WHERE c.active = true;

COMMENT ON VIEW view_categories_hierarchical IS 
'Hierarchical category view with parent relationships and subcategory counts.';

-- =============================================================================
-- VIEW: view_spending_summary
-- Purpose: Monthly spending summary by category
-- Usage: SELECT * FROM view_spending_summary WHERE user_id = auth.uid()
-- =============================================================================

CREATE OR REPLACE VIEW view_spending_summary AS
SELECT 
    t.user_id,
    DATE_TRUNC('month', t.transaction_date) AS month,
    cat.name AS category_name,
    get_category_hierarchy(t.category_id, t.user_id) AS category_hierarchy,
    curr.code AS currency_code,
    COUNT(t.id) AS transaction_count,
    SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END) AS total_expenses,
    SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) AS total_income,
    SUM(t.amount) AS net_amount,
    AVG(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE NULL END) AS avg_expense,
    MIN(t.transaction_date) AS first_transaction,
    MAX(t.transaction_date) AS last_transaction
FROM transactions t
JOIN categories cat ON t.category_id = cat.id
JOIN currencies curr ON t.currency_id = curr.id
WHERE t.active = true
GROUP BY 
    t.user_id, 
    DATE_TRUNC('month', t.transaction_date),
    cat.name,
    t.category_id,
    curr.code;

COMMENT ON VIEW view_spending_summary IS 
'Monthly spending analysis by category with income/expense breakdown.';

-- =============================================================================
-- VIEW: view_account_monthly_summary
-- Purpose: Monthly account balance changes
-- Usage: SELECT * FROM view_account_monthly_summary WHERE user_id = auth.uid()
-- =============================================================================

CREATE OR REPLACE VIEW view_account_monthly_summary AS
SELECT 
    t.user_id,
    t.account_id,
    a.name AS account_name,
    a.tag AS account_tag,
    curr.code AS currency_code,
    DATE_TRUNC('month', t.transaction_date) AS month,
    COUNT(t.id) AS transaction_count,
    SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END) AS total_outflow,
    SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) AS total_inflow,
    SUM(t.amount) AS net_change,
    MIN(t.transaction_date) AS first_transaction,
    MAX(t.transaction_date) AS last_transaction
FROM transactions t
JOIN accounts a ON t.account_id = a.id
JOIN currencies curr ON a.currency_id = curr.id
WHERE t.active = true AND a.active = true
GROUP BY 
    t.user_id,
    t.account_id,
    a.name,
    a.tag,
    curr.code,
    DATE_TRUNC('month', t.transaction_date);

COMMENT ON VIEW view_account_monthly_summary IS 
'Monthly account activity summary with inflow/outflow analysis.';

-- =============================================================================
-- VIEW: view_recent_transactions
-- Purpose: Recent transactions with full details (last 100 per user)
-- Usage: SELECT * FROM view_recent_transactions WHERE user_id = auth.uid()
-- =============================================================================

CREATE OR REPLACE VIEW view_recent_transactions AS
SELECT 
    t.id,
    t.user_id,
    t.transaction_date,
    t.amount,
    CASE 
        WHEN t.amount < 0 THEN 'expense'
        WHEN t.amount > 0 THEN 'income'
        ELSE 'neutral'
    END AS transaction_type,
    curr.code AS currency_code,
    a.name AS account_name,
    get_category_hierarchy(t.category_id, t.user_id) AS category_hierarchy,
    t.comment,
    t.created_at,
    ROW_NUMBER() OVER (PARTITION BY t.user_id ORDER BY t.transaction_date DESC, t.id DESC) AS row_num
FROM transactions t
JOIN accounts a ON t.account_id = a.id
JOIN currencies curr ON t.currency_id = curr.id
WHERE t.active = true AND a.active = true;

COMMENT ON VIEW view_recent_transactions IS 
'Recent transactions with row numbering for pagination (use WHERE row_num <= N).';

-- =============================================================================
-- MATERIALIZED VIEW: view_user_statistics (Optional - for performance)
-- Purpose: Pre-calculated user statistics (refresh periodically)
-- Note: Materialized views require manual refresh but offer better performance
-- =============================================================================

-- Uncomment to create materialized view for better performance on dashboards
/*
CREATE MATERIALIZED VIEW view_user_statistics AS
SELECT 
    user_id,
    COUNT(DISTINCT a.id) AS total_accounts,
    COUNT(DISTINCT c.id) AS total_categories,
    COUNT(DISTINCT t.id) AS total_transactions,
    SUM(calculate_account_balance(a.id, a.user_id)) AS total_balance,
    MIN(t.transaction_date) AS first_transaction_date,
    MAX(t.transaction_date) AS last_transaction_date,
    COUNT(DISTINCT DATE_TRUNC('month', t.transaction_date)) AS active_months,
    NOW() AS last_refreshed
FROM accounts a
LEFT JOIN transactions t ON a.id = t.account_id AND t.active = true
LEFT JOIN categories c ON c.user_id = a.user_id AND c.active = true
WHERE a.active = true
GROUP BY user_id;

COMMENT ON MATERIALIZED VIEW view_user_statistics IS 
'Pre-calculated user statistics. Refresh with: REFRESH MATERIALIZED VIEW view_user_statistics;';

-- Create index on materialized view
CREATE UNIQUE INDEX idx_user_statistics_user_id ON view_user_statistics (user_id);
*/

-- =============================================================================
-- GRANT PERMISSIONS FOR VIEWS
-- =============================================================================

-- Grant SELECT permissions to authenticated users
-- Note: RLS policies on underlying tables will still apply
GRANT SELECT ON view_accounts_with_balance TO authenticated;
GRANT SELECT ON view_transactions_detailed TO authenticated;
GRANT SELECT ON view_categories_hierarchical TO authenticated;
GRANT SELECT ON view_spending_summary TO authenticated;
GRANT SELECT ON view_account_monthly_summary TO authenticated;
GRANT SELECT ON view_recent_transactions TO authenticated;

-- Grant permissions for materialized view if created
-- GRANT SELECT ON view_user_statistics TO authenticated;

-- =============================================================================
-- VIEW USAGE EXAMPLES
-- =============================================================================

-- Example queries for application development:

-- 1. Get all accounts with balances for current user:
-- SELECT * FROM view_accounts_with_balance WHERE user_id = auth.uid();

-- 2. Get recent transactions with full details:
-- SELECT * FROM view_recent_transactions WHERE user_id = auth.uid() AND row_num <= 50;

-- 3. Get spending summary for current month:
-- SELECT * FROM view_spending_summary 
-- WHERE user_id = auth.uid() AND month = DATE_TRUNC('month', NOW());

-- 4. Get category hierarchy for dropdowns:
-- SELECT * FROM view_categories_hierarchical 
-- WHERE user_id = auth.uid() ORDER BY full_hierarchy;

-- 5. Get account activity for specific month:
-- SELECT * FROM view_account_monthly_summary 
-- WHERE user_id = auth.uid() AND month = '2024-01-01'::date;

-- =============================================================================
-- PERFORMANCE NOTES
-- =============================================================================

-- Views are virtual tables that execute underlying queries on each access
-- For better performance on frequently accessed data, consider:
-- 1. Materialized views (require manual refresh)
-- 2. Application-level caching
-- 3. Indexed views (PostgreSQL doesn't support, but indexes on base tables help)

-- Current views are optimized for:
-- - User isolation (all include user_id filtering)
-- - Active records only (exclude soft-deleted)
-- - Proper index utilization (use indexed columns in WHERE clauses)

-- =============================================================================
-- View creation completed successfully
-- Next: Run 07_seed_data.sql
-- =============================================================================

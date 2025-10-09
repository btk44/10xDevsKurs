-- migration: create database views
-- description: creates views for simplified data access and reporting
-- author: database team
-- date: 2025-10-07
-- dependencies: accounts, categories, transactions tables, functions
-- note: views inherit rls policies from underlying tables

-- ============================================================================
-- view: view_accounts_with_balance
-- ============================================================================
-- purpose: simplifies ui queries by combining accounts with calculated balances
-- business logic:
--   - shows only active accounts
--   - balance calculated using calculate_account_balance function
--   - includes currency information for display
-- usage: single query instead of separate balance calculations in application

create view view_accounts_with_balance as
select 
    a.id,
    a.user_id,
    a.name,
    c.code as currency_code,
    c.description as currency_description,
    a.tag,
    calculate_account_balance(a.id, a.user_id) as balance,
    a.active,
    a.created_at,
    a.updated_at
from accounts a
join currencies c on a.currency_id = c.id
where a.active = true;

comment on view view_accounts_with_balance is 'accounts with calculated balances (income adds, expense subtracts)';

-- ============================================================================
-- view: view_category_monthly_summary
-- ============================================================================
-- purpose: provides monthly transaction summaries with hierarchical aggregation
-- business logic:
--   - summarizes transactions for current calendar month
--   - groups by category with hierarchical rollup
--   - subcategory amounts included in parent category totals
--   - shows both main categories and individual subcategories
--   - separated by category type (income/expense)
--   - only includes active categories and transactions
-- performance:
--   - optimized with partial index on current month transactions
--   - uses ctes for readability and potential query optimization
-- columns:
--   - user_id: user identifier
--   - category_id: category identifier
--   - category_name: category name
--   - category_type: 'income' or 'expense'
--   - parent_id: 0 for main categories, parent_id for subcategories
--   - total_amount: sum of transaction amounts (always positive)
--   - transaction_count: number of transactions
--   - report_date: current date when view was queried

create view view_category_monthly_summary as
with current_month_start as (
    select date_trunc('month', current_date)::date as month_start
),
current_month_end as (
    select (date_trunc('month', current_date) + interval '1 month')::date as month_end
),
-- get all transactions for current month with category info
monthly_transactions as (
    select 
        t.user_id,
        t.category_id,
        c.name as category_name,
        c.category_type,
        c.parent_id,
        t.amount
    from transactions t
    join categories c on t.category_id = c.id
    cross join current_month_start cms
    cross join current_month_end cme
    where t.active = true
        and c.active = true
        and t.transaction_date >= cms.month_start
        and t.transaction_date < cme.month_end
),
-- aggregate by subcategory
subcategory_sums as (
    select 
        user_id,
        category_id,
        category_name,
        category_type,
        parent_id,
        sum(amount) as total_amount,
        count(*) as transaction_count
    from monthly_transactions
    where parent_id > 0
    group by user_id, category_id, category_name, category_type, parent_id
),
-- aggregate by main category (including direct transactions)
main_category_direct as (
    select 
        user_id,
        category_id,
        category_name,
        category_type,
        parent_id,
        sum(amount) as total_amount,
        count(*) as transaction_count
    from monthly_transactions
    where parent_id = 0
    group by user_id, category_id, category_name, category_type, parent_id
),
-- roll up subcategory amounts to parents
parent_rollup as (
    select 
        s.user_id,
        s.parent_id as category_id,
        sum(s.total_amount) as subcategory_total,
        sum(s.transaction_count) as subcategory_transaction_count
    from subcategory_sums s
    group by s.user_id, s.parent_id
)
-- combine main categories with rolled-up subcategory totals
select 
    coalesce(m.user_id, p.user_id) as user_id,
    coalesce(m.category_id, p.category_id) as category_id,
    m.category_name,
    m.category_type,
    m.parent_id,
    coalesce(m.total_amount, 0) + coalesce(p.subcategory_total, 0) as total_amount,
    coalesce(m.transaction_count, 0) + coalesce(p.subcategory_transaction_count, 0) as transaction_count,
    current_date as report_date
from main_category_direct m
full outer join parent_rollup p on m.user_id = p.user_id and m.category_id = p.category_id

union all

-- include subcategories as separate rows
select 
    user_id,
    category_id,
    category_name,
    category_type,
    parent_id,
    total_amount,
    transaction_count,
    current_date as report_date
from subcategory_sums;

comment on view view_category_monthly_summary is 'monthly transaction summary with hierarchical category rollup';


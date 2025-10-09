-- migration: create database functions
-- description: creates helper functions for business logic
-- author: database team
-- date: 2025-10-07
-- dependencies: accounts, categories, transactions tables, category_type_enum

-- ============================================================================
-- function: calculate_account_balance
-- ============================================================================
-- purpose: calculates current balance for a given account
-- logic:
--   - sums all active transactions for the account
--   - income transactions (category_type = 'income') add to balance
--   - expense transactions (category_type = 'expense') subtract from balance
--   - only includes active transactions and active categories
-- parameters:
--   - p_account_id: account id to calculate balance for
--   - p_user_id: user id for security validation
-- returns: decimal(12,2) - current account balance

create or replace function calculate_account_balance(
    p_account_id bigint, 
    p_user_id uuid
) 
returns decimal(12,2)
language plpgsql
stable
security definer
as $$
declare
    v_balance decimal(12,2);
begin
    -- calculate balance using category type to determine sign
    select coalesce(
        sum(
            case 
                when c.category_type = 'income' then t.amount
                when c.category_type = 'expense' then -t.amount
            end
        ), 
        0
    )
    into v_balance
    from transactions t
    join categories c on t.category_id = c.id
    where t.account_id = p_account_id
        and t.user_id = p_user_id
        and t.active = true
        and c.active = true;

    return v_balance;
end;
$$;

comment on function calculate_account_balance is 'calculates account balance using category types (income adds, expense subtracts)';

-- ============================================================================
-- function: get_category_type
-- ============================================================================
-- purpose: retrieves the type of a category
-- logic: simple lookup of category_type field
-- parameters:
--   - p_category_id: category id to get type for
-- returns: category_type_enum - 'income' or 'expense'

create or replace function get_category_type(p_category_id bigint)
returns category_type_enum
language plpgsql
stable
security definer
as $$
declare
    v_type category_type_enum;
begin
    select category_type
    into v_type
    from categories
    where id = p_category_id;

    return v_type;
end;
$$;

comment on function get_category_type is 'returns the type (income/expense) of a given category';

-- ============================================================================
-- function: update_updated_at_column
-- ============================================================================
-- purpose: automatically updates the updated_at timestamp
-- logic: sets updated_at to current timestamp whenever a row is updated
-- usage: attached as trigger to all tables with updated_at column
-- returns: trigger

create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

comment on function update_updated_at_column is 'trigger function to automatically update updated_at timestamp';


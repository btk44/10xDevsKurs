-- migration: enable row level security
-- description: enables rls and creates policies for data isolation
-- author: database team
-- date: 2025-10-07
-- dependencies: currencies, accounts, categories, transactions tables
-- security note: all user tables must have rls enabled for data isolation

-- ============================================================================
-- currencies table - read-only access for all users
-- ============================================================================
-- business rule: currencies are global and available to all users
-- users cannot modify currencies (read-only)

alter table currencies enable row level security;

-- allow anonymous users to read currencies
create policy currencies_select_anon on currencies
    for select
    to anon
    using (true);

-- allow authenticated users to read currencies
create policy currencies_select_auth on currencies
    for select
    to authenticated
    using (true);

-- ============================================================================
-- accounts table - user-isolated access
-- ============================================================================
-- business rule: users can only access their own accounts
-- rls enforces: auth.uid() = user_id

alter table accounts enable row level security;

-- select policy for anonymous users (should not access)
create policy accounts_select_anon on accounts
    for select
    to anon
    using (false);

-- select policy for authenticated users
create policy accounts_select_auth on accounts
    for select
    to authenticated
    using (auth.uid() = user_id);

-- insert policy for anonymous users (should not insert)
create policy accounts_insert_anon on accounts
    for insert
    to anon
    with check (false);

-- insert policy for authenticated users
create policy accounts_insert_auth on accounts
    for insert
    to authenticated
    with check (auth.uid() = user_id);

-- update policy for anonymous users (should not update)
create policy accounts_update_anon on accounts
    for update
    to anon
    using (false)
    with check (false);

-- update policy for authenticated users
create policy accounts_update_auth on accounts
    for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- delete policy for anonymous users (should not delete)
create policy accounts_delete_anon on accounts
    for delete
    to anon
    using (false);

-- delete policy for authenticated users
create policy accounts_delete_auth on accounts
    for delete
    to authenticated
    using (auth.uid() = user_id);

-- ============================================================================
-- categories table - user-isolated access
-- ============================================================================
-- business rule: users can only access their own categories
-- rls enforces: auth.uid() = user_id

alter table categories enable row level security;

-- select policy for anonymous users (should not access)
create policy categories_select_anon on categories
    for select
    to anon
    using (false);

-- select policy for authenticated users
create policy categories_select_auth on categories
    for select
    to authenticated
    using (auth.uid() = user_id);

-- insert policy for anonymous users (should not insert)
create policy categories_insert_anon on categories
    for insert
    to anon
    with check (false);

-- insert policy for authenticated users
create policy categories_insert_auth on categories
    for insert
    to authenticated
    with check (auth.uid() = user_id);

-- update policy for anonymous users (should not update)
create policy categories_update_anon on categories
    for update
    to anon
    using (false)
    with check (false);

-- update policy for authenticated users
create policy categories_update_auth on categories
    for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- delete policy for anonymous users (should not delete)
create policy categories_delete_anon on categories
    for delete
    to anon
    using (false);

-- delete policy for authenticated users
create policy categories_delete_auth on categories
    for delete
    to authenticated
    using (auth.uid() = user_id);

-- ============================================================================
-- transactions table - user-isolated access
-- ============================================================================
-- business rule: users can only access their own transactions
-- rls enforces: auth.uid() = user_id

alter table transactions enable row level security;

-- select policy for anonymous users (should not access)
create policy transactions_select_anon on transactions
    for select
    to anon
    using (false);

-- select policy for authenticated users
create policy transactions_select_auth on transactions
    for select
    to authenticated
    using (auth.uid() = user_id);

-- insert policy for anonymous users (should not insert)
create policy transactions_insert_anon on transactions
    for insert
    to anon
    with check (false);

-- insert policy for authenticated users
create policy transactions_insert_auth on transactions
    for insert
    to authenticated
    with check (auth.uid() = user_id);

-- update policy for anonymous users (should not update)
create policy transactions_update_anon on transactions
    for update
    to anon
    using (false)
    with check (false);

-- update policy for authenticated users
create policy transactions_update_auth on transactions
    for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- delete policy for anonymous users (should not delete)
create policy transactions_delete_anon on transactions
    for delete
    to anon
    using (false);

-- delete policy for authenticated users
create policy transactions_delete_auth on transactions
    for delete
    to authenticated
    using (auth.uid() = user_id);


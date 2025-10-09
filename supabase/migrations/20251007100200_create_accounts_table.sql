-- migration: create accounts table
-- description: creates the accounts table for storing user financial accounts
-- author: database team
-- date: 2025-10-07
-- dependencies: currencies table

-- ============================================================================
-- accounts table
-- ============================================================================
-- purpose: stores user financial accounts (e.g., bank account, cash, credit card)
-- scope: user-isolated - each user has their own accounts
-- business rules:
--   - each account belongs to one user (user_id from auth.users)
--   - each account has one currency that cannot be changed
--   - account names cannot be empty
--   - accounts use soft delete (active flag)
--   - balance is NOT stored - calculated on demand from transactions

create table accounts (
  -- primary key: auto-incrementing bigserial for scalability
  id bigserial primary key,
  
  -- user ownership - references supabase auth.users
  -- note: no foreign key constraint due to supabase auth schema separation
  user_id uuid not null,
  
  -- account name (e.g., "main bank account", "cash wallet")
  name varchar(100) not null,
  
  -- currency for this account
  currency_id integer not null references currencies(id),
  
  -- optional short tag for quick identification (max 10 chars)
  tag varchar(10),
  
  -- soft delete flag - false means account is deleted
  -- when account is soft deleted, all its transactions should also be soft deleted
  active boolean not null default true,
  
  -- audit timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- constraints
  constraint check_account_name_not_empty check (length(trim(name)) > 0)
);

-- ============================================================================
-- indexes for performance
-- ============================================================================

-- index for user isolation and filtering active accounts
create index idx_accounts_user_active on accounts(user_id, active) where active = true;

-- index for currency foreign key lookups
create index idx_accounts_currency on accounts(currency_id);

-- ============================================================================
-- comments for documentation
-- ============================================================================

comment on table accounts is 'user financial accounts (bank accounts, cash, credit cards, etc.)';
comment on column accounts.user_id is 'owner of the account - references auth.users(id)';
comment on column accounts.name is 'user-defined account name';
comment on column accounts.currency_id is 'account currency - cannot be changed after creation';
comment on column accounts.tag is 'optional short identifier for quick account recognition';
comment on column accounts.active is 'soft delete flag - false means deleted';


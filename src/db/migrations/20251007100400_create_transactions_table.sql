-- migration: create transactions table
-- description: creates the transactions table for storing financial transactions
-- author: database team
-- date: 2025-10-07
-- dependencies: accounts, categories, currencies tables

-- ============================================================================
-- transactions table
-- ============================================================================
-- purpose: stores all user financial transactions (income and expenses)
-- scope: user-isolated - each user has their own transactions
-- business rules:
--   - each transaction belongs to one account and one category
--   - transaction amount must always be POSITIVE (> 0)
--   - transaction type (income/expense) is derived from category type
--   - transaction date stored with time but displayed as date in ui
--   - transactions use soft delete (active flag)
--   - deleting account or category is blocked if active transactions exist

create table transactions (
  -- primary key: auto-incrementing bigserial for scalability
  id bigserial primary key,
  
  -- user ownership - references supabase auth.users
  -- note: no foreign key constraint due to supabase auth schema separation
  user_id uuid not null,
  
  -- transaction date and time (displayed as date only in ui)
  transaction_date timestamptz not null,
  
  -- account where transaction occurred
  -- on delete restrict: cannot delete account with active transactions
  account_id bigint not null references accounts(id) on delete restrict,
  
  -- category for transaction classification
  -- on delete restrict: cannot delete category with active transactions
  category_id bigint not null references categories(id) on delete restrict,
  
  -- transaction amount - MUST BE POSITIVE
  -- type (income/expense) is determined by category type, not amount sign
  -- range: 0.01 to 9999999999.99
  amount decimal(12,2) not null,
  
  -- currency for this transaction
  currency_id integer not null references currencies(id),
  
  -- optional comment/description (max 255 characters handled in application)
  comment text,
  
  -- soft delete flag - false means transaction is deleted
  active boolean not null default true,
  
  -- audit timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- constraints
  -- critical: amount must be positive - transaction type comes from category
  constraint check_amount_positive check (amount > 0),
  constraint check_amount_range check (amount <= 9999999999.99)
);

-- ============================================================================
-- indexes for performance
-- ============================================================================

-- index for user isolation and filtering active transactions
create index idx_transactions_user_active on transactions(user_id, active) where active = true;

-- index for account foreign key lookups
create index idx_transactions_account on transactions(account_id) where active = true;

-- index for category foreign key lookups
create index idx_transactions_category on transactions(category_id) where active = true;

-- index for currency foreign key lookups
create index idx_transactions_currency on transactions(currency_id);

-- index for date-based filtering and sorting (descending for recent first)
create index idx_transactions_date on transactions(transaction_date desc) where active = true;

-- composite index for user + date queries (transaction list)
create index idx_transactions_user_date on transactions(user_id, transaction_date desc) where active = true;

-- composite index for balance calculation
create index idx_transactions_balance on transactions(user_id, account_id, active) where active = true;

-- composite index for category monthly analysis
create index idx_transactions_category_month on transactions(category_id, transaction_date, amount) where active = true;

-- composite index for monthly summary optimization (current month)
-- this partial index covers only current month for better performance
create index idx_transactions_monthly on transactions(user_id, transaction_date, category_id) 
  where active = true and transaction_date >= date_trunc('month', current_date);

-- full-text search index for comment field (using simple dictionary)
create index idx_transactions_comment_fts on transactions using gin(to_tsvector('simple', comment));

-- ============================================================================
-- comments for documentation
-- ============================================================================

comment on table transactions is 'financial transactions (income and expenses)';
comment on column transactions.user_id is 'owner of the transaction - references auth.users(id)';
comment on column transactions.transaction_date is 'date and time of transaction';
comment on column transactions.account_id is 'account where transaction occurred';
comment on column transactions.category_id is 'category for transaction classification';
comment on column transactions.amount is 'transaction amount - must be positive, type determined by category';
comment on column transactions.currency_id is 'transaction currency';
comment on column transactions.comment is 'optional transaction description or note';
comment on column transactions.active is 'soft delete flag - false means deleted';


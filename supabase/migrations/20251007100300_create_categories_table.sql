-- migration: create categories table
-- description: creates the categories table for organizing income and expense transactions
-- author: database team
-- date: 2025-10-07
-- dependencies: category_type_enum

-- ============================================================================
-- categories table
-- ============================================================================
-- purpose: stores hierarchical categories for classifying transactions
-- scope: user-isolated - each user has their own categories
-- business rules:
--   - supports 2-level hierarchy: main categories and subcategories
--   - main category: parent_id = 0
--   - subcategory: parent_id > 0 (references a main category)
--   - each category has a type: 'income' or 'expense'
--   - subcategories inherit type from parent (validated by trigger)
--   - category type determines how transactions affect account balance
--   - categories use soft delete (active flag)
--   - cannot delete category if it has active transactions

create table categories (
  -- primary key: auto-incrementing bigserial for scalability
  id bigserial primary key,
  
  -- user ownership - references supabase auth.users
  -- note: no foreign key constraint due to supabase auth schema separation
  user_id uuid not null,
  
  -- category name (e.g., "groceries", "salary", "rent")
  name varchar(100) not null,
  
  -- category type: determines if transactions are income or expense
  category_type category_type_enum not null default 'expense',
  
  -- parent category id for hierarchy
  -- 0 = main category (no parent)
  -- > 0 = subcategory (references parent category id)
  -- note: no foreign key because 0 doesn't exist in table
  parent_id bigint not null default 0,
  
  -- optional short tag for quick identification (max 10 chars)
  tag varchar(10),
  
  -- soft delete flag - false means category is deleted
  active boolean not null default true,
  
  -- audit timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- constraints
  constraint check_category_name_not_empty check (length(trim(name)) > 0),
  constraint check_parent_id_non_negative check (parent_id >= 0),
  constraint check_category_not_self_parent check (id != parent_id)
);

-- ============================================================================
-- indexes for performance
-- ============================================================================

-- index for user isolation and filtering active categories
create index idx_categories_user_active on categories(user_id, active) where active = true;

-- index for finding main categories
create index idx_categories_main on categories(user_id) where parent_id = 0 and active = true;

-- index for finding subcategories of a parent
create index idx_categories_parent on categories(parent_id, user_id) where parent_id > 0 and active = true;

-- index for filtering by category type
create index idx_categories_type on categories(user_id, category_type) where active = true;

-- ============================================================================
-- comments for documentation
-- ============================================================================

comment on table categories is 'hierarchical categories for classifying income and expense transactions';
comment on column categories.user_id is 'owner of the category - references auth.users(id)';
comment on column categories.name is 'user-defined category name';
comment on column categories.category_type is 'income or expense - determines transaction impact on balance';
comment on column categories.parent_id is '0 for main category, >0 for subcategory (max 2 levels)';
comment on column categories.tag is 'optional short identifier for quick category recognition';
comment on column categories.active is 'soft delete flag - false means deleted';


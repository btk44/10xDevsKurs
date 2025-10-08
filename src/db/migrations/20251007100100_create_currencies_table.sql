-- migration: create currencies table
-- description: creates the currencies lookup table with ISO 4217 currency codes
-- author: database team
-- date: 2025-10-07
-- dependencies: none

-- ============================================================================
-- currencies table
-- ============================================================================
-- purpose: stores predefined list of available currencies for the application
-- scope: global - available to all users (read-only access)
-- business rules:
--   - currencies use ISO 4217 3-letter codes (e.g., PLN, USD, EUR)
--   - currencies cannot be deleted (no soft delete flag)
--   - all currency codes must be uppercase

create table currencies (
  -- primary key: auto-incrementing serial
  id serial primary key,
  
  -- iso 4217 currency code (3 uppercase letters)
  code varchar(3) not null unique,
  
  -- human-readable currency name/description
  description varchar(100) not null,
  
  -- whether currency is active and available for selection
  active boolean not null default true,
  
  -- audit timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- constraints
  constraint check_currency_code_format check (code ~ '^[A-Z]{3}$'),
  constraint check_currency_description_not_empty check (length(trim(description)) > 0)
);

-- ============================================================================
-- comments for documentation
-- ============================================================================

comment on table currencies is 'global lookup table for ISO 4217 currency codes';
comment on column currencies.code is 'ISO 4217 3-letter currency code (uppercase)';
comment on column currencies.description is 'human-readable currency name';
comment on column currencies.active is 'flag indicating if currency is available for selection';


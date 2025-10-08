-- migration: create enum types
-- description: creates custom enum types used across the database schema
-- author: database team
-- date: 2025-10-07

-- ============================================================================
-- category_type_enum
-- ============================================================================
-- purpose: defines the type of a category (income or expense)
-- usage: used in categories table to classify transaction types
-- values:
--   - 'income': represents income transactions (positive impact on balance)
--   - 'expense': represents expense transactions (negative impact on balance)

create type category_type_enum as enum ('income', 'expense');

-- note: enum types in postgresql require special care when adding new values
-- to add a new value in the future, use: alter type category_type_enum add value 'new_value';


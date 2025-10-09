-- migration: create database triggers
-- description: creates triggers for business logic and data validation
-- author: database team
-- date: 2025-10-07
-- dependencies: functions, categories, transactions tables

-- ============================================================================
-- trigger function: validate_category_depth
-- ============================================================================
-- purpose: validates category hierarchy rules
-- business rules enforced:
--   - maximum 2 levels: main category and subcategory
--   - parent category must exist and be active
--   - parent cannot be a subcategory (to prevent 3rd level)
--   - subcategory type must match parent category type
-- fires: before insert or update on categories

create or replace function validate_category_depth()
returns trigger
language plpgsql
as $$
declare
    v_parent_depth integer;
    v_parent_type category_type_enum;
begin
    -- if this is a main category (parent_id = 0), allow without validation
    if new.parent_id = 0 then
        return new;
    end if;

    -- check if parent exists and get its depth and type
    select 
        case when parent_id = 0 then 1 else 2 end,
        category_type
    into v_parent_depth, v_parent_type
    from categories
    where id = new.parent_id 
        and user_id = new.user_id 
        and active = true;

    -- parent must exist
    if not found then
        raise exception 'parent category does not exist or is not active';
    end if;

    -- parent cannot be a subcategory (would create 3rd level)
    if v_parent_depth > 1 then
        raise exception 'maximum category depth is 2 levels';
    end if;

    -- subcategory type must match parent type
    if new.category_type != v_parent_type then
        raise exception 'subcategory type must match parent category type';
    end if;

    return new;
end;
$$;

comment on function validate_category_depth is 'validates category hierarchy rules (max 2 levels, type inheritance)';

-- attach trigger to categories table
create trigger trigger_validate_category_depth
    before insert or update on categories
    for each row
    execute function validate_category_depth();

-- ============================================================================
-- trigger function: cascade_category_type_to_children
-- ============================================================================
-- purpose: cascades category type changes to all child categories
-- business rules enforced:
--   - when parent category type changes, all children inherit new type
--   - ensures type consistency in hierarchy
--   - maintains type inheritance rule
-- fires: after update on categories
-- note: only fires when category_type is changed on a parent category

create or replace function cascade_category_type_to_children()
returns trigger
language plpgsql
as $$
begin
    -- only cascade if category_type changed on a parent category (parent_id = 0)
    if old.category_type != new.category_type and new.parent_id = 0 then
        -- update all children to match new type
        update categories
        set category_type = new.category_type,
            updated_at = now()
        where parent_id = new.id
            and user_id = new.user_id
            and active = true;
    end if;

    return new;
end;
$$;

comment on function cascade_category_type_to_children is 'cascades type changes from parent to child categories';

-- attach trigger to categories table
create trigger trigger_cascade_category_type
    after update on categories
    for each row
    execute function cascade_category_type_to_children();

-- ============================================================================
-- auto-update timestamps triggers
-- ============================================================================
-- purpose: automatically update updated_at timestamp on row modifications
-- fires: before update on all tables with updated_at column

-- currencies table
create trigger trigger_update_currencies_updated_at
    before update on currencies
    for each row
    execute function update_updated_at_column();

-- accounts table
create trigger trigger_update_accounts_updated_at
    before update on accounts
    for each row
    execute function update_updated_at_column();

-- categories table
create trigger trigger_update_categories_updated_at
    before update on categories
    for each row
    execute function update_updated_at_column();

-- transactions table
create trigger trigger_update_transactions_updated_at
    before update on transactions
    for each row
    execute function update_updated_at_column();


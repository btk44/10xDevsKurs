-- =============================================================================
-- 04_create_triggers.sql
-- Create triggers for data validation and automatic field updates
-- Triggers: Category depth validation, Automatic timestamp updates
-- =============================================================================

-- =============================================================================
-- TRIGGER: Category hierarchy validation
-- Purpose: Ensure category hierarchy doesn't exceed 2 levels
-- Table: categories
-- Events: BEFORE INSERT OR UPDATE
-- =============================================================================

CREATE TRIGGER trigger_validate_category_depth
    BEFORE INSERT OR UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION validate_category_depth();

COMMENT ON TRIGGER trigger_validate_category_depth ON categories IS 
'Validates category hierarchy depth before insert/update operations.';

-- =============================================================================
-- TRIGGER: Auto-update timestamps on currencies
-- Purpose: Automatically update updated_at column on changes
-- Table: currencies
-- Events: BEFORE UPDATE
-- =============================================================================

CREATE TRIGGER trigger_currencies_updated_at
    BEFORE UPDATE ON currencies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER trigger_currencies_updated_at ON currencies IS 
'Automatically updates updated_at timestamp on currency changes.';

-- =============================================================================
-- TRIGGER: Auto-update timestamps on accounts
-- Purpose: Automatically update updated_at column on changes
-- Table: accounts
-- Events: BEFORE UPDATE
-- =============================================================================

CREATE TRIGGER trigger_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER trigger_accounts_updated_at ON accounts IS 
'Automatically updates updated_at timestamp on account changes.';

-- =============================================================================
-- TRIGGER: Auto-update timestamps on categories
-- Purpose: Automatically update updated_at column on changes
-- Table: categories
-- Events: BEFORE UPDATE
-- =============================================================================

CREATE TRIGGER trigger_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER trigger_categories_updated_at ON categories IS 
'Automatically updates updated_at timestamp on category changes.';

-- =============================================================================
-- TRIGGER: Auto-update timestamps on transactions
-- Purpose: Automatically update updated_at column on changes
-- Table: transactions
-- Events: BEFORE UPDATE
-- =============================================================================

CREATE TRIGGER trigger_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER trigger_transactions_updated_at ON transactions IS 
'Automatically updates updated_at timestamp on transaction changes.';

-- =============================================================================
-- Additional validation triggers (optional, can be implemented in application)
-- =============================================================================

-- =============================================================================
-- TRIGGER FUNCTION: Validate transaction references
-- Purpose: Ensure transaction references valid active accounts/categories
-- Note: This is implemented as a function but trigger creation is commented out
--       to allow application-level validation flexibility
-- =============================================================================

CREATE OR REPLACE FUNCTION validate_transaction_references()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_account_active BOOLEAN;
    v_category_active BOOLEAN;
    v_account_user_id UUID;
    v_category_user_id UUID;
BEGIN
    -- Validate account exists, is active, and belongs to same user
    SELECT active, user_id
    INTO v_account_active, v_account_user_id
    FROM accounts
    WHERE id = NEW.account_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Account (id: %) does not exist', NEW.account_id;
    END IF;
    
    IF NOT v_account_active THEN
        RAISE EXCEPTION 'Cannot create transaction for inactive account (id: %)', NEW.account_id;
    END IF;
    
    IF v_account_user_id != NEW.user_id THEN
        RAISE EXCEPTION 'Account (id: %) does not belong to user', NEW.account_id;
    END IF;
    
    -- Validate category exists, is active, and belongs to same user
    SELECT active, user_id
    INTO v_category_active, v_category_user_id
    FROM categories
    WHERE id = NEW.category_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Category (id: %) does not exist', NEW.category_id;
    END IF;
    
    IF NOT v_category_active THEN
        RAISE EXCEPTION 'Cannot create transaction for inactive category (id: %)', NEW.category_id;
    END IF;
    
    IF v_category_user_id != NEW.user_id THEN
        RAISE EXCEPTION 'Category (id: %) does not belong to user', NEW.category_id;
    END IF;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION validate_transaction_references() IS 
'Validates transaction references to accounts and categories. Can be used as trigger function.';

-- =============================================================================
-- OPTIONAL: Uncomment to enable strict transaction validation
-- Note: This may impact performance and is typically handled in application layer
-- =============================================================================

/*
CREATE TRIGGER trigger_validate_transaction_references
    BEFORE INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION validate_transaction_references();
*/

-- =============================================================================
-- TRIGGER FUNCTION: Log transaction changes (audit trail)
-- Purpose: Log all changes to transactions for audit purposes
-- Note: Requires audit_log table (not included in MVP)
-- =============================================================================

CREATE OR REPLACE FUNCTION log_transaction_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- This function would log changes to an audit table
    -- Implementation depends on audit requirements
    -- For MVP, this is just a placeholder
    
    -- Example audit log entry:
    -- INSERT INTO audit_log (table_name, operation, old_values, new_values, user_id, timestamp)
    -- VALUES ('transactions', TG_OP, row_to_json(OLD), row_to_json(NEW), NEW.user_id, NOW());
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

COMMENT ON FUNCTION log_transaction_changes() IS 
'Placeholder for transaction audit logging. Requires audit_log table implementation.';

-- =============================================================================
-- Performance considerations for triggers
-- =============================================================================

-- NOTES:
-- 1. All triggers are designed to be lightweight and fast
-- 2. Complex validation is moved to application layer for better performance
-- 3. Timestamp triggers only fire on UPDATE operations (not INSERT)
-- 4. Category validation trigger uses efficient queries with proper indexes
-- 5. Optional triggers are commented out to allow application-level control

-- =============================================================================
-- Trigger creation completed successfully
-- Next: Run 05_enable_rls.sql
-- =============================================================================

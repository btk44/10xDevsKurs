-- =============================================================================
-- 03_create_functions.sql
-- Create helper functions for business logic
-- Functions: calculate_account_balance, update_updated_at_column
-- =============================================================================

-- =============================================================================
-- Function: calculate_account_balance
-- Purpose: Calculate real-time balance for a specific account
-- Usage: SELECT calculate_account_balance(account_id, user_id);
-- Returns: DECIMAL(12,2) - sum of all active transactions for the account
-- =============================================================================

CREATE OR REPLACE FUNCTION calculate_account_balance(
    p_account_id BIGINT,
    p_user_id UUID
) 
RETURNS DECIMAL(12,2)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_balance DECIMAL(12,2);
BEGIN
    -- Validate input parameters
    IF p_account_id IS NULL OR p_user_id IS NULL THEN
        RETURN 0.00;
    END IF;
    
    -- Calculate balance from active transactions only
    -- Uses idx_transactions_balance index for optimal performance
    SELECT COALESCE(SUM(amount), 0.00)
    INTO v_balance
    FROM transactions
    WHERE account_id = p_account_id 
      AND user_id = p_user_id 
      AND active = true;
    
    RETURN v_balance;
END;
$$;

COMMENT ON FUNCTION calculate_account_balance(BIGINT, UUID) IS 
'Calculate real-time account balance from active transactions. Used by views and application code.';

-- =============================================================================
-- Function: update_updated_at_column
-- Purpose: Generic trigger function to automatically update updated_at timestamp
-- Usage: Called by triggers on INSERT/UPDATE operations
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Set updated_at to current timestamp on UPDATE operations
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_updated_at_column() IS 
'Generic trigger function to automatically update updated_at column on record changes.';

-- =============================================================================
-- Function: validate_category_depth
-- Purpose: Ensure category hierarchy doesn't exceed 2 levels
-- Usage: Called by trigger before INSERT/UPDATE on categories table
-- Business rule: parent_id = 0 (main category), parent_id > 0 (subcategory, max depth)
-- =============================================================================

CREATE OR REPLACE FUNCTION validate_category_depth()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_parent_parent_id BIGINT;
BEGIN
    -- Allow main categories (parent_id = 0)
    IF NEW.parent_id = 0 THEN
        RETURN NEW;
    END IF;
    
    -- For subcategories (parent_id > 0), validate parent exists and is main category
    IF NEW.parent_id > 0 THEN
        -- Check if parent exists and belongs to same user
        SELECT parent_id 
        INTO v_parent_parent_id
        FROM categories 
        WHERE id = NEW.parent_id 
          AND user_id = NEW.user_id 
          AND active = true;
        
        -- Parent must exist
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Parent category (id: %) does not exist or does not belong to user', NEW.parent_id;
        END IF;
        
        -- Parent must be main category (parent_id = 0)
        IF v_parent_parent_id != 0 THEN
            RAISE EXCEPTION 'Cannot create subcategory under another subcategory. Maximum depth is 2 levels.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION validate_category_depth() IS 
'Validates category hierarchy depth (max 2 levels). Ensures parent exists and is main category.';

-- =============================================================================
-- Function: get_category_hierarchy
-- Purpose: Get full category path for display purposes
-- Usage: SELECT get_category_hierarchy(category_id, user_id);
-- Returns: TEXT - "Main Category > Subcategory" or just "Main Category"
-- =============================================================================

CREATE OR REPLACE FUNCTION get_category_hierarchy(
    p_category_id BIGINT,
    p_user_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_category_name VARCHAR(100);
    v_parent_id BIGINT;
    v_parent_name VARCHAR(100);
    v_hierarchy TEXT;
BEGIN
    -- Validate input parameters
    IF p_category_id IS NULL OR p_user_id IS NULL THEN
        RETURN '';
    END IF;
    
    -- Get category details
    SELECT name, parent_id
    INTO v_category_name, v_parent_id
    FROM categories
    WHERE id = p_category_id 
      AND user_id = p_user_id 
      AND active = true;
    
    -- Category not found
    IF NOT FOUND THEN
        RETURN '';
    END IF;
    
    -- Main category (parent_id = 0)
    IF v_parent_id = 0 THEN
        RETURN v_category_name;
    END IF;
    
    -- Subcategory - get parent name
    SELECT name
    INTO v_parent_name
    FROM categories
    WHERE id = v_parent_id 
      AND user_id = p_user_id 
      AND active = true;
    
    -- Build hierarchy string
    IF v_parent_name IS NOT NULL THEN
        v_hierarchy := v_parent_name || ' > ' || v_category_name;
    ELSE
        v_hierarchy := v_category_name;
    END IF;
    
    RETURN v_hierarchy;
END;
$$;

COMMENT ON FUNCTION get_category_hierarchy(BIGINT, UUID) IS 
'Returns full category hierarchy path for display (e.g., "Food > Restaurants").';

-- =============================================================================
-- Function: get_account_summary
-- Purpose: Get account details with balance in one query
-- Usage: SELECT * FROM get_account_summary(user_id);
-- Returns: TABLE with account details and calculated balance
-- =============================================================================

CREATE OR REPLACE FUNCTION get_account_summary(p_user_id UUID)
RETURNS TABLE (
    account_id BIGINT,
    account_name VARCHAR(100),
    currency_code VARCHAR(3),
    currency_description VARCHAR(100),
    tag VARCHAR(10),
    balance DECIMAL(12,2),
    transaction_count BIGINT,
    last_transaction_date TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        c.code,
        c.description,
        a.tag,
        calculate_account_balance(a.id, p_user_id),
        COUNT(t.id),
        MAX(t.transaction_date)
    FROM accounts a
    JOIN currencies c ON a.currency_id = c.id
    LEFT JOIN transactions t ON a.id = t.account_id AND t.user_id = p_user_id AND t.active = true
    WHERE a.user_id = p_user_id AND a.active = true
    GROUP BY a.id, a.name, c.code, c.description, a.tag
    ORDER BY a.name;
END;
$$;

COMMENT ON FUNCTION get_account_summary(UUID) IS 
'Returns comprehensive account summary with balance and transaction statistics.';

-- =============================================================================
-- Grant permissions for functions
-- =============================================================================

-- Grant execute permissions to authenticated users
-- Note: SECURITY DEFINER functions run with creator privileges
GRANT EXECUTE ON FUNCTION calculate_account_balance(BIGINT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_category_hierarchy(BIGINT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_account_summary(UUID) TO authenticated;

-- update_updated_at_column and validate_category_depth are trigger functions
-- No explicit grants needed as they're called by triggers

-- =============================================================================
-- Function creation completed successfully
-- Next: Run 04_create_triggers.sql
-- =============================================================================

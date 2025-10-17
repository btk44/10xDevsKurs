-- =============================================================================
-- 05_enable_rls.sql
-- Enable Row Level Security (RLS) and create security policies
-- Purpose: Ensure complete data isolation between users
-- =============================================================================

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all user-specific tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Note: currencies table does NOT have RLS enabled - it's global read-only data

-- =============================================================================
-- RLS POLICIES FOR ACCOUNTS TABLE
-- =============================================================================

-- Policy: Users can only see their own accounts
CREATE POLICY accounts_user_isolation ON accounts
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY accounts_user_isolation ON accounts IS 
'Users can only access accounts they own (user_id = auth.uid())';

-- =============================================================================
-- RLS POLICIES FOR CATEGORIES TABLE
-- =============================================================================

-- Policy: Users can only see their own categories
CREATE POLICY categories_user_isolation ON categories
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY categories_user_isolation ON categories IS 
'Users can only access categories they own (user_id = auth.uid())';

-- =============================================================================
-- RLS POLICIES FOR TRANSACTIONS TABLE
-- =============================================================================

-- Policy: Users can only see their own transactions
CREATE POLICY transactions_user_isolation ON transactions
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY transactions_user_isolation ON transactions IS 
'Users can only access transactions they own (user_id = auth.uid())';

-- =============================================================================
-- RLS POLICIES FOR CURRENCIES TABLE (Read-only access)
-- =============================================================================

-- Policy: All authenticated users can read currencies
CREATE POLICY currencies_read_access ON currencies
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Prevent modifications by regular users (admin only)
CREATE POLICY currencies_admin_only ON currencies
    FOR ALL
    TO authenticated
    USING (false)
    WITH CHECK (false);

COMMENT ON POLICY currencies_read_access ON currencies IS 
'All authenticated users can read currency data';

COMMENT ON POLICY currencies_admin_only ON currencies IS 
'Prevents regular users from modifying currencies (admin/service role only)';

-- =============================================================================
-- ADDITIONAL SECURITY POLICIES (Optional)
-- =============================================================================

-- =============================================================================
-- Policy: Prevent access to soft-deleted records
-- Note: These are additional policies that can be enabled for extra security
-- They ensure soft-deleted records are not accessible even if application logic fails
-- =============================================================================

-- Uncomment these policies if you want database-level soft delete enforcement
-- Note: This may impact performance and is typically handled in application layer

/*
-- Accounts: Hide soft-deleted records
CREATE POLICY accounts_active_only ON accounts
    FOR ALL
    TO authenticated
    USING (active = true)
    WITH CHECK (active = true);

-- Categories: Hide soft-deleted records  
CREATE POLICY categories_active_only ON categories
    FOR ALL
    TO authenticated
    USING (active = true)
    WITH CHECK (active = true);

-- Transactions: Hide soft-deleted records
CREATE POLICY transactions_active_only ON transactions
    FOR ALL
    TO authenticated
    USING (active = true)
    WITH CHECK (active = true);
*/

-- =============================================================================
-- SERVICE ROLE POLICIES (For application backend)
-- =============================================================================

-- Allow service role to bypass RLS for administrative operations
-- Note: This is typically configured at the connection level, not through policies

-- Example service role policies (commented out - configure based on your needs):
/*
-- Service role can access all data for administrative purposes
CREATE POLICY accounts_service_access ON accounts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY categories_service_access ON categories
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY transactions_service_access ON transactions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
*/

-- =============================================================================
-- GRANT PERMISSIONS FOR TABLES
-- =============================================================================

-- Grant appropriate permissions to authenticated users
-- Note: RLS policies will still apply even with these grants

-- Currencies: Read-only access for all authenticated users
GRANT SELECT ON currencies TO authenticated;

-- Accounts: Full access for authenticated users (RLS applies)
GRANT SELECT, INSERT, UPDATE, DELETE ON accounts TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE accounts_id_seq TO authenticated;

-- Categories: Full access for authenticated users (RLS applies)
GRANT SELECT, INSERT, UPDATE, DELETE ON categories TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE categories_id_seq TO authenticated;

-- Transactions: Full access for authenticated users (RLS applies)
GRANT SELECT, INSERT, UPDATE, DELETE ON transactions TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE transactions_id_seq TO authenticated;

-- =============================================================================
-- TESTING RLS POLICIES
-- =============================================================================

-- Create a test function to verify RLS is working correctly
CREATE OR REPLACE FUNCTION test_rls_isolation()
RETURNS TABLE (
    test_name TEXT,
    status TEXT,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    other_user_id UUID := gen_random_uuid();
    test_account_id BIGINT;
    visible_count INTEGER;
BEGIN
    -- Test 1: Create account for test user
    INSERT INTO accounts (user_id, name, currency_id)
    VALUES (test_user_id, 'Test Account', 1)
    RETURNING id INTO test_account_id;
    
    -- Test 2: Try to access account as different user (should fail)
    SET LOCAL role = authenticated;
    SET LOCAL "request.jwt.claims" = json_build_object('sub', other_user_id::text);
    
    SELECT COUNT(*)
    INTO visible_count
    FROM accounts
    WHERE id = test_account_id;
    
    IF visible_count = 0 THEN
        RETURN QUERY SELECT 'RLS Isolation Test'::TEXT, 'PASS'::TEXT, 'User cannot see other user accounts'::TEXT;
    ELSE
        RETURN QUERY SELECT 'RLS Isolation Test'::TEXT, 'FAIL'::TEXT, 'User can see other user accounts'::TEXT;
    END IF;
    
    -- Cleanup
    RESET role;
    DELETE FROM accounts WHERE id = test_account_id;
    
    RETURN;
END;
$$;

COMMENT ON FUNCTION test_rls_isolation() IS 
'Test function to verify RLS policies are working correctly. Run after setup.';

-- =============================================================================
-- SECURITY NOTES
-- =============================================================================

-- IMPORTANT SECURITY CONSIDERATIONS:
-- 
-- 1. RLS policies use auth.uid() which relies on JWT tokens
-- 2. Always use authenticated role for application connections
-- 3. Service role bypasses RLS - use with extreme caution
-- 4. Test RLS policies thoroughly before production deployment
-- 5. Monitor for any RLS bypass attempts in logs
-- 
-- 6. Application should validate user_id matches auth.uid() before operations
-- 7. Consider additional application-level security checks
-- 8. Regular security audits of RLS policies recommended
-- 
-- 9. Soft delete records are still accessible unless additional policies applied
-- 10. Database admin roles can bypass RLS - restrict access appropriately

-- =============================================================================
-- RLS setup completed successfully
-- Next: Run 06_create_views.sql
-- =============================================================================

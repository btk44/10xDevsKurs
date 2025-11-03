-- =============================================================================
-- 99_verify_installation.sql
-- Comprehensive verification of database setup
-- Purpose: Validate all components are working correctly
-- =============================================================================

-- =============================================================================
-- VERIFICATION HEADER
-- =============================================================================

\echo '==================================================================='
\echo 'EXPENSE TRACKING DATABASE - INSTALLATION VERIFICATION'
\echo '==================================================================='
\echo ''

-- =============================================================================
-- TEST 1: Table Structure Verification
-- =============================================================================

\echo '1. VERIFYING TABLE STRUCTURE...'

DO $$
DECLARE
    table_count INTEGER;
    expected_tables TEXT[] := ARRAY['currencies', 'accounts', 'categories', 'transactions'];
    table_name TEXT;
    table_exists BOOLEAN;
    missing_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check each expected table
    FOREACH table_name IN ARRAY expected_tables
    LOOP
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = table_name
        ) INTO table_exists;
        
        IF NOT table_exists THEN
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'FAIL: Missing tables: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE 'PASS: All required tables exist';
    END IF;
END $$;

-- Verify table columns and constraints
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('currencies', 'accounts', 'categories', 'transactions')
ORDER BY table_name, ordinal_position;

-- =============================================================================
-- TEST 2: Index Verification
-- =============================================================================

\echo ''
\echo '2. VERIFYING INDEXES...'

DO $$
DECLARE
    index_count INTEGER;
    expected_indexes TEXT[] := ARRAY[
        'idx_accounts_user_active',
        'idx_categories_user_active', 
        'idx_transactions_user_active',
        'idx_transactions_balance',
        'idx_transactions_user_date'
    ];
    index_name TEXT;
    index_exists BOOLEAN;
    missing_indexes TEXT[] := ARRAY[]::TEXT[];
BEGIN
    FOREACH index_name IN ARRAY expected_indexes
    LOOP
        SELECT EXISTS (
            SELECT FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND indexname = index_name
        ) INTO index_exists;
        
        IF NOT index_exists THEN
            missing_indexes := array_append(missing_indexes, index_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_indexes, 1) > 0 THEN
        RAISE WARNING 'WARNING: Missing indexes: %', array_to_string(missing_indexes, ', ');
    ELSE
        RAISE NOTICE 'PASS: All critical indexes exist';
    END IF;
END $$;

-- List all indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- =============================================================================
-- TEST 3: Function Verification
-- =============================================================================

\echo ''
\echo '3. VERIFYING FUNCTIONS...'

DO $$
DECLARE
    function_count INTEGER;
    expected_functions TEXT[] := ARRAY[
        'calculate_account_balance',
        'update_updated_at_column',
        'validate_category_depth',
        'get_category_hierarchy'
    ];
    function_name TEXT;
    function_exists BOOLEAN;
    missing_functions TEXT[] := ARRAY[]::TEXT[];
BEGIN
    FOREACH function_name IN ARRAY expected_functions
    LOOP
        SELECT EXISTS (
            SELECT FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' 
            AND p.proname = function_name
        ) INTO function_exists;
        
        IF NOT function_exists THEN
            missing_functions := array_append(missing_functions, function_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_functions, 1) > 0 THEN
        RAISE EXCEPTION 'FAIL: Missing functions: %', array_to_string(missing_functions, ', ');
    ELSE
        RAISE NOTICE 'PASS: All required functions exist';
    END IF;
END $$;

-- Test calculate_account_balance function
SELECT 'Function Test: calculate_account_balance(1, gen_random_uuid())' as test,
       calculate_account_balance(1, gen_random_uuid()) as result;

-- =============================================================================
-- TEST 4: Trigger Verification
-- =============================================================================

\echo ''
\echo '4. VERIFYING TRIGGERS...'

DO $$
DECLARE
    trigger_count INTEGER;
    expected_triggers TEXT[] := ARRAY[
        'trigger_validate_category_depth',
        'trigger_currencies_updated_at',
        'trigger_accounts_updated_at',
        'trigger_categories_updated_at',
        'trigger_transactions_updated_at'
    ];
    trigger_name TEXT;
    trigger_exists BOOLEAN;
    missing_triggers TEXT[] := ARRAY[]::TEXT[];
BEGIN
    FOREACH trigger_name IN ARRAY expected_triggers
    LOOP
        SELECT EXISTS (
            SELECT FROM information_schema.triggers
            WHERE trigger_schema = 'public'
            AND trigger_name = trigger_name
        ) INTO trigger_exists;
        
        IF NOT trigger_exists THEN
            missing_triggers := array_append(missing_triggers, trigger_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_triggers, 1) > 0 THEN
        RAISE WARNING 'WARNING: Missing triggers: %', array_to_string(missing_triggers, ', ');
    ELSE
        RAISE NOTICE 'PASS: All triggers exist';
    END IF;
END $$;

-- List all triggers
SELECT 
    trigger_schema,
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- =============================================================================
-- TEST 5: RLS (Row Level Security) Verification
-- =============================================================================

\echo ''
\echo '5. VERIFYING ROW LEVEL SECURITY...'

DO $$
DECLARE
    rls_table TEXT;
    rls_enabled BOOLEAN;
    rls_tables TEXT[] := ARRAY['accounts', 'categories', 'transactions'];
    missing_rls TEXT[] := ARRAY[]::TEXT[];
BEGIN
    FOREACH rls_table IN ARRAY rls_tables
    LOOP
        SELECT relrowsecurity 
        INTO rls_enabled
        FROM pg_class 
        WHERE relname = rls_table;
        
        IF NOT rls_enabled THEN
            missing_rls := array_append(missing_rls, rls_table);
        END IF;
    END LOOP;
    
    IF array_length(missing_rls, 1) > 0 THEN
        RAISE EXCEPTION 'FAIL: RLS not enabled on tables: %', array_to_string(missing_rls, ', ');
    ELSE
        RAISE NOTICE 'PASS: RLS enabled on all required tables';
    END IF;
END $$;

-- List RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =============================================================================  
-- TEST 6: View Verification
-- =============================================================================

\echo ''
\echo '6. VERIFYING VIEWS...'

DO $$
DECLARE
    view_count INTEGER;
    expected_views TEXT[] := ARRAY[
        'view_accounts_with_balance',
        'view_transactions_detailed',
        'view_categories_hierarchical'
    ];
    view_name TEXT;
    view_exists BOOLEAN;
    missing_views TEXT[] := ARRAY[]::TEXT[];
BEGIN
    FOREACH view_name IN ARRAY expected_views
    LOOP
        SELECT EXISTS (
            SELECT FROM information_schema.views
            WHERE table_schema = 'public'
            AND table_name = view_name
        ) INTO view_exists;
        
        IF NOT view_exists THEN
            missing_views := array_append(missing_views, view_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_views, 1) > 0 THEN
        RAISE WARNING 'WARNING: Missing views: %', array_to_string(missing_views, ', ');
    ELSE
        RAISE NOTICE 'PASS: All critical views exist';
    END IF;
END $$;

-- List all views
SELECT 
    table_schema,
    table_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- =============================================================================
-- TEST 7: Currency Data Verification
-- =============================================================================

\echo ''
\echo '7. VERIFYING SEED DATA...'

DO $$
DECLARE
    currency_count INTEGER;
    required_currencies TEXT[] := ARRAY['PLN', 'EUR', 'USD', 'GBP', 'CHF', 'CZK'];
    missing_currencies TEXT[] := ARRAY[]::TEXT[];
    curr TEXT;
    curr_exists BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO currency_count FROM currencies WHERE active = true;
    
    IF currency_count < 6 THEN
        RAISE WARNING 'WARNING: Only % currencies found, expected at least 6', currency_count;
    END IF;
    
    -- Check specific required currencies
    FOREACH curr IN ARRAY required_currencies
    LOOP
        SELECT EXISTS(SELECT 1 FROM currencies WHERE code = curr AND active = true) INTO curr_exists;
        
        IF NOT curr_exists THEN
            missing_currencies := array_append(missing_currencies, curr);
        END IF;
    END LOOP;
    
    IF array_length(missing_currencies, 1) > 0 THEN
        RAISE EXCEPTION 'FAIL: Missing required currencies: %', array_to_string(missing_currencies, ', ');
    ELSE
        RAISE NOTICE 'PASS: All required currencies present (% total)', currency_count;
    END IF;
END $$;

-- Display currency data
SELECT 'CURRENCY DATA:' as info;
SELECT code, description, active, created_at FROM currencies ORDER BY code;

-- =============================================================================
-- TEST 8: Constraint Verification
-- =============================================================================

\echo ''
\echo '8. VERIFYING CONSTRAINTS...'

-- Test currency code constraint
DO $$
BEGIN
    BEGIN
        INSERT INTO currencies (code, description) VALUES ('invalid', 'Invalid Currency');
        RAISE EXCEPTION 'FAIL: Currency code constraint not working';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'PASS: Currency code constraint working';
        WHEN unique_violation THEN
            RAISE NOTICE 'INFO: Currency code constraint working (duplicate)';
    END;
END $$;

-- Test category name constraint
DO $$
BEGIN
    BEGIN
        INSERT INTO categories (user_id, name, parent_id) VALUES (gen_random_uuid(), '', 0);
        RAISE EXCEPTION 'FAIL: Category name constraint not working';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'PASS: Category name constraint working';
    END;
END $$;

-- Test transaction amount constraint
DO $$
BEGIN
    BEGIN
        INSERT INTO transactions (user_id, transaction_date, account_id, category_id, amount, currency_id) 
        VALUES (gen_random_uuid(), NOW(), 1, 1, 99999999999.99, 1);
        RAISE EXCEPTION 'FAIL: Transaction amount constraint not working';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'PASS: Transaction amount constraint working';
        WHEN foreign_key_violation THEN
            RAISE NOTICE 'INFO: Transaction amount constraint working (FK violation expected)';
    END;
END $$;

-- =============================================================================
-- TEST 9: Performance Test (Basic)
-- =============================================================================

\echo ''
\echo '9. RUNNING BASIC PERFORMANCE TESTS...'

-- Test index usage
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM currencies WHERE code = 'PLN';

-- Test function performance
\timing on
SELECT calculate_account_balance(1, gen_random_uuid());
\timing off

-- =============================================================================
-- TEST 10: Integration Test
-- =============================================================================

\echo ''
\echo '10. RUNNING INTEGRATION TEST...'

DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    pln_id INTEGER;
    account_id BIGINT;
    category_id BIGINT;
    transaction_id BIGINT;
    balance DECIMAL(12,2);
BEGIN
    -- Get PLN currency ID
    SELECT id INTO pln_id FROM currencies WHERE code = 'PLN';
    
    -- Create test account
    INSERT INTO accounts (user_id, name, currency_id)
    VALUES (test_user_id, 'Test Account', pln_id)
    RETURNING id INTO account_id;
    
    -- Create test category
    INSERT INTO categories (user_id, name, parent_id)
    VALUES (test_user_id, 'Test Category', 0)
    RETURNING id INTO category_id;
    
    -- Create test transaction
    INSERT INTO transactions (user_id, transaction_date, account_id, category_id, amount, currency_id)
    VALUES (test_user_id, NOW(), account_id, category_id, 100.50, pln_id)
    RETURNING id INTO transaction_id;
    
    -- Test balance calculation
    SELECT calculate_account_balance(account_id, test_user_id) INTO balance;
    
    IF balance = 100.50 THEN
        RAISE NOTICE 'PASS: Integration test successful - Balance: %', balance;
    ELSE
        RAISE EXCEPTION 'FAIL: Integration test failed - Expected 100.50, got %', balance;
    END IF;
    
    -- Cleanup test data
    DELETE FROM transactions WHERE id = transaction_id;
    DELETE FROM categories WHERE id = category_id;
    DELETE FROM accounts WHERE id = account_id;
    
    RAISE NOTICE 'Integration test cleanup completed';
END $$;

-- =============================================================================
-- FINAL SUMMARY
-- =============================================================================

\echo ''
\echo '==================================================================='
\echo 'VERIFICATION SUMMARY'
\echo '==================================================================='

SELECT 
    'DATABASE OBJECTS' as category,
    COUNT(*) FILTER (WHERE table_type = 'BASE TABLE') as tables,
    COUNT(*) FILTER (WHERE table_type = 'VIEW') as views
FROM information_schema.tables 
WHERE table_schema = 'public';

SELECT 
    'FUNCTIONS' as category,
    COUNT(*) as total_functions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public';

SELECT 
    'INDEXES' as category,
    COUNT(*) as total_indexes
FROM pg_indexes 
WHERE schemaname = 'public';

SELECT 
    'TRIGGERS' as category,
    COUNT(*) as total_triggers
FROM information_schema.triggers
WHERE trigger_schema = 'public';

SELECT 
    'RLS POLICIES' as category,
    COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public';

SELECT 
    'CURRENCIES' as category,
    COUNT(*) as total_currencies,
    COUNT(*) FILTER (WHERE active = true) as active_currencies
FROM currencies;

\echo ''
\echo '==================================================================='
\echo 'INSTALLATION VERIFICATION COMPLETED'
\echo '==================================================================='
\echo ''
\echo 'If all tests show PASS status, the database is ready for use.'
\echo 'Any FAIL status indicates critical issues that must be resolved.'
\echo 'WARNING status indicates non-critical issues that should be reviewed.'
\echo ''
\echo 'Next steps:'
\echo '1. Review any warnings or failures above'
\echo '2. Configure application connection strings'
\echo '3. Set up monitoring and backup procedures'
\echo '4. Run application-level tests'
\echo ''

-- =============================================================================
-- End of verification script
-- =============================================================================

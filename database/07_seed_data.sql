-- =============================================================================
-- 07_seed_data.sql
-- Insert initial data for the expense tracking application
-- Data: Predefined currencies as specified in PRD
-- =============================================================================

-- =============================================================================
-- SEED DATA: Currencies
-- Purpose: Insert predefined currencies for global use
-- Business requirement: PLN, EUR, USD, GBP, CHF, CZK
-- =============================================================================

INSERT INTO currencies (code, description) VALUES 
    ('PLN', 'Polski Złoty'),
    ('EUR', 'Euro'),
    ('USD', 'US Dollar'),
    ('GBP', 'British Pound'),
    ('CHF', 'Swiss Franc'),
    ('CZK', 'Czech Koruna')
ON CONFLICT (code) DO NOTHING;

-- Verify currencies were inserted
DO $$
DECLARE
    currency_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO currency_count FROM currencies WHERE active = true;
    
    IF currency_count >= 6 THEN
        RAISE NOTICE 'SUCCESS: % currencies inserted successfully', currency_count;
    ELSE
        RAISE WARNING 'WARNING: Only % currencies found, expected at least 6', currency_count;
    END IF;
END $$;

-- =============================================================================
-- OPTIONAL: Additional currencies (commented out)
-- Uncomment and modify as needed for specific regions/requirements
-- =============================================================================

/*
INSERT INTO currencies (code, description) VALUES 
    ('CAD', 'Canadian Dollar'),
    ('AUD', 'Australian Dollar'),
    ('JPY', 'Japanese Yen'),
    ('SEK', 'Swedish Krona'),
    ('NOK', 'Norwegian Krone'),
    ('DKK', 'Danish Krone'),
    ('HUF', 'Hungarian Forint'),
    ('RON', 'Romanian Leu'),
    ('BGN', 'Bulgarian Lev'),
    ('HRK', 'Croatian Kuna'),
    ('RUB', 'Russian Ruble'),
    ('UAH', 'Ukrainian Hryvnia'),
    ('TRY', 'Turkish Lira'),
    ('CNY', 'Chinese Yuan'),
    ('INR', 'Indian Rupee'),
    ('BRL', 'Brazilian Real'),
    ('MXN', 'Mexican Peso'),
    ('ZAR', 'South African Rand'),
    ('SGD', 'Singapore Dollar'),
    ('HKD', 'Hong Kong Dollar'),
    ('NZD', 'New Zealand Dollar'),
    ('KRW', 'South Korean Won'),
    ('THB', 'Thai Baht'),
    ('MYR', 'Malaysian Ringgit'),
    ('PHP', 'Philippine Peso'),
    ('IDR', 'Indonesian Rupiah'),
    ('VND', 'Vietnamese Dong')
ON CONFLICT (code) DO NOTHING;
*/

-- =============================================================================
-- SEED DATA: Default categories (Optional)
-- Purpose: Provide common expense/income categories for new users
-- Note: These are user-specific, so they would need to be created per user
-- This section is commented out as categories are user-specific in the design
-- =============================================================================

/*
-- Function to create default categories for a new user
CREATE OR REPLACE FUNCTION create_default_categories(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Main expense categories
    INSERT INTO categories (user_id, name, parent_id, tag) VALUES
        (p_user_id, 'Food & Dining', 0, 'FOOD'),
        (p_user_id, 'Transportation', 0, 'TRANS'),
        (p_user_id, 'Shopping', 0, 'SHOP'),
        (p_user_id, 'Entertainment', 0, 'FUN'),
        (p_user_id, 'Bills & Utilities', 0, 'BILLS'),
        (p_user_id, 'Healthcare', 0, 'HEALTH'),
        (p_user_id, 'Education', 0, 'EDU'),
        (p_user_id, 'Travel', 0, 'TRAVEL'),
        (p_user_id, 'Home & Garden', 0, 'HOME'),
        (p_user_id, 'Personal Care', 0, 'CARE');
    
    -- Main income categories
    INSERT INTO categories (user_id, name, parent_id, tag) VALUES
        (p_user_id, 'Salary', 0, 'SALARY'),
        (p_user_id, 'Business Income', 0, 'BIZ'),
        (p_user_id, 'Investments', 0, 'INVEST'),
        (p_user_id, 'Other Income', 0, 'OTHER');
    
    -- Example subcategories for Food & Dining
    INSERT INTO categories (user_id, name, parent_id, tag) VALUES
        (p_user_id, 'Restaurants', (SELECT id FROM categories WHERE user_id = p_user_id AND name = 'Food & Dining'), 'REST'),
        (p_user_id, 'Groceries', (SELECT id FROM categories WHERE user_id = p_user_id AND name = 'Food & Dining'), 'GROC'),
        (p_user_id, 'Fast Food', (SELECT id FROM categories WHERE user_id = p_user_id AND name = 'Food & Dining'), 'FAST');
    
    -- Example subcategories for Transportation
    INSERT INTO categories (user_id, name, parent_id, tag) VALUES
        (p_user_id, 'Gas & Fuel', (SELECT id FROM categories WHERE user_id = p_user_id AND name = 'Transportation'), 'GAS'),
        (p_user_id, 'Public Transport', (SELECT id FROM categories WHERE user_id = p_user_id AND name = 'Transportation'), 'PUBLIC'),
        (p_user_id, 'Car Maintenance', (SELECT id FROM categories WHERE user_id = p_user_id AND name = 'Transportation'), 'MAINT');
    
    RAISE NOTICE 'Default categories created for user %', p_user_id;
END;
$$;

COMMENT ON FUNCTION create_default_categories(UUID) IS 
'Creates default expense and income categories for a new user. Call after user registration.';
*/

-- =============================================================================
-- SEED DATA: Sample accounts (For development/testing only)
-- Purpose: Create sample data for development and testing
-- WARNING: This creates test data - remove for production deployment
-- =============================================================================

-- Uncomment for development/testing environments only
/*
DO $$
DECLARE
    test_user_id UUID := '550e8400-e29b-41d4-a716-446655440000'; -- Example UUID
    pln_currency_id INTEGER;
    eur_currency_id INTEGER;
    account_id BIGINT;
    category_id BIGINT;
BEGIN
    -- Get currency IDs
    SELECT id INTO pln_currency_id FROM currencies WHERE code = 'PLN';
    SELECT id INTO eur_currency_id FROM currencies WHERE code = 'EUR';
    
    -- Create sample accounts
    INSERT INTO accounts (user_id, name, currency_id, tag) VALUES
        (test_user_id, 'Main Checking Account', pln_currency_id, 'MAIN'),
        (test_user_id, 'Savings Account', pln_currency_id, 'SAVE'),
        (test_user_id, 'Credit Card', pln_currency_id, 'CC'),
        (test_user_id, 'Cash Wallet', pln_currency_id, 'CASH'),
        (test_user_id, 'EUR Travel Account', eur_currency_id, 'TRAVEL');
    
    -- Create sample categories
    INSERT INTO categories (user_id, name, parent_id, tag) VALUES
        (test_user_id, 'Food & Dining', 0, 'FOOD'),
        (test_user_id, 'Transportation', 0, 'TRANS'),
        (test_user_id, 'Salary', 0, 'SALARY');
    
    -- Get IDs for sample transactions
    SELECT id INTO account_id FROM accounts WHERE user_id = test_user_id AND name = 'Main Checking Account';
    SELECT id INTO category_id FROM categories WHERE user_id = test_user_id AND name = 'Salary';
    
    -- Create sample transactions
    INSERT INTO transactions (user_id, transaction_date, account_id, category_id, amount, currency_id, comment) VALUES
        (test_user_id, NOW() - INTERVAL '1 day', account_id, category_id, 5000.00, pln_currency_id, 'Monthly salary'),
        (test_user_id, NOW() - INTERVAL '2 days', account_id, (SELECT id FROM categories WHERE user_id = test_user_id AND name = 'Food & Dining'), -45.50, pln_currency_id, 'Grocery shopping'),
        (test_user_id, NOW() - INTERVAL '3 days', account_id, (SELECT id FROM categories WHERE user_id = test_user_id AND name = 'Transportation'), -15.00, pln_currency_id, 'Bus ticket');
    
    RAISE NOTICE 'Sample test data created for user %', test_user_id;
    RAISE NOTICE 'WARNING: This is test data - remove for production!';
END $$;
*/

-- =============================================================================
-- DATA VALIDATION
-- =============================================================================

-- Verify all required currencies are present and active
DO $$
DECLARE
    missing_currencies TEXT[];
    required_currencies TEXT[] := ARRAY['PLN', 'EUR', 'USD', 'GBP', 'CHF', 'CZK'];
    curr TEXT;
    curr_exists BOOLEAN;
BEGIN
    FOREACH curr IN ARRAY required_currencies
    LOOP
        SELECT EXISTS(SELECT 1 FROM currencies WHERE code = curr AND active = true) INTO curr_exists;
        
        IF NOT curr_exists THEN
            missing_currencies := array_append(missing_currencies, curr);
        END IF;
    END LOOP;
    
    IF array_length(missing_currencies, 1) > 0 THEN
        RAISE EXCEPTION 'Missing required currencies: %', array_to_string(missing_currencies, ', ');
    ELSE
        RAISE NOTICE 'SUCCESS: All required currencies are present and active';
    END IF;
END $$;

-- Display currency summary
SELECT 
    'Currency Summary' as info,
    COUNT(*) as total_currencies,
    COUNT(*) FILTER (WHERE active = true) as active_currencies,
    COUNT(*) FILTER (WHERE active = false) as inactive_currencies
FROM currencies;

-- Display inserted currencies
SELECT 
    code,
    description,
    active,
    created_at
FROM currencies 
ORDER BY 
    CASE code 
        WHEN 'PLN' THEN 1
        WHEN 'EUR' THEN 2  
        WHEN 'USD' THEN 3
        WHEN 'GBP' THEN 4
        WHEN 'CHF' THEN 5
        WHEN 'CZK' THEN 6
        ELSE 99
    END;

-- =============================================================================
-- CLEANUP FUNCTIONS (For development)
-- =============================================================================

-- Function to clean up test data (development only)
/*
CREATE OR REPLACE FUNCTION cleanup_test_data()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete test transactions
    DELETE FROM transactions WHERE user_id = '550e8400-e29b-41d4-a716-446655440000';
    
    -- Delete test categories  
    DELETE FROM categories WHERE user_id = '550e8400-e29b-41d4-a716-446655440000';
    
    -- Delete test accounts
    DELETE FROM accounts WHERE user_id = '550e8400-e29b-41d4-a716-446655440000';
    
    RAISE NOTICE 'Test data cleaned up successfully';
END;
$$;
*/

-- =============================================================================
-- Seed data insertion completed successfully
-- Next: Run 99_verify_installation.sql
-- =============================================================================

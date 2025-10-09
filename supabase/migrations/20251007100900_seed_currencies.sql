-- migration: seed currencies data
-- description: inserts predefined currency codes into currencies table
-- author: database team
-- date: 2025-10-07
-- dependencies: currencies table
-- note: this is initial seed data for mvp

-- ============================================================================
-- insert predefined currencies
-- ============================================================================
-- purpose: provide commonly used currencies for the application
-- currencies: pln, eur, usd, gbp, chf, czk
-- source: iso 4217 standard
-- note: additional currencies can be added manually by administrators

insert into currencies (code, description) values 
    ('PLN', 'Polish Zloty'),
    ('EUR', 'Euro'),
    ('USD', 'US Dollar'),
    ('GBP', 'British Pound'),
    ('CHF', 'Swiss Franc'),
    ('CZK', 'Czech Koruna')
on conflict (code) do nothing;

-- note: 'on conflict do nothing' allows migration to be run multiple times safely


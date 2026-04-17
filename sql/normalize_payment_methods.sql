-- ══════════════════════════════════════════════════════════
-- NORMALIZE PAYMENT METHODS: lowercase canonical forms
-- Run this ONCE in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════

-- 1. Update existing transaction data to lowercase
UPDATE transactions SET payment_method = 'pix' WHERE payment_method = 'Pix';
UPDATE transactions SET payment_method = 'credito' WHERE payment_method IN ('Crédito', 'Credito');
UPDATE transactions SET payment_method = 'debito' WHERE payment_method IN ('Débito', 'Debito');
UPDATE transactions SET payment_method = 'dinheiro' WHERE payment_method = 'Dinheiro';

-- 2. Update users default_payment to lowercase
UPDATE users SET default_payment = 'pix' WHERE lower(default_payment) LIKE '%pix%';
UPDATE users SET default_payment = 'credito' WHERE lower(default_payment) LIKE '%cr%dit%';
UPDATE users SET default_payment = 'debito' WHERE lower(default_payment) LIKE '%d%bit%';
UPDATE users SET default_payment = 'dinheiro' WHERE lower(default_payment) LIKE '%dinheir%';

-- 3. Drop old constraint and create new one with lowercase values
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('pix', 'credito', 'debito', 'dinheiro'));

-- 4. Set default_payment column default to lowercase
ALTER TABLE users ALTER COLUMN default_payment SET DEFAULT 'pix';

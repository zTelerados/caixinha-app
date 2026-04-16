-- ════════════════════════════════════════════════════════════
-- CAIXINHA v9 — Cartões de Crédito, Faturas e Parcelamento
-- Rodar no SQL Editor do Supabase Dashboard
-- ════════════════════════════════════════════════════════════

-- CREDIT_CARDS — entidade cartão
CREATE TABLE IF NOT EXISTS credit_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,                       -- "Nubank Roxinho", "C6 Carbon"
  last_digits TEXT,                         -- últimos 4 dígitos, opcional
  bank TEXT,                                -- "Nubank", "C6 Bank", etc
  due_day INT NOT NULL CHECK (due_day BETWEEN 1 AND 31),       -- dia do vencimento
  close_day INT NOT NULL CHECK (close_day BETWEEN 1 AND 31),   -- dia do fechamento
  color TEXT DEFAULT '#8B5CF6',             -- cor pro dashboard
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_credit_cards_user ON credit_cards(user_id) WHERE active = TRUE;

-- INVOICES — faturas por cartão / ciclo
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  card_id UUID REFERENCES credit_cards(id) ON DELETE CASCADE NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL CHECK (year BETWEEN 2024 AND 2099),
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'paid')),
  due_date DATE NOT NULL,
  close_date DATE NOT NULL,
  paid_date DATE,
  paid_amount DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(card_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_status ON invoices(user_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_card_status ON invoices(card_id, status);

-- TRANSACTIONS — novas colunas pra vincular cartão, fatura e parcelamento
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS installment_group_id UUID,          -- mesmo pra todas as parcelas da mesma compra
  ADD COLUMN IF NOT EXISTS installment_current INT,            -- 1, 2, 3, ...
  ADD COLUMN IF NOT EXISTS installment_total INT;              -- total de parcelas

CREATE INDEX IF NOT EXISTS idx_transactions_card ON transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice ON transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_transactions_installment_group ON transactions(installment_group_id) WHERE installment_group_id IS NOT NULL;

-- TRIGGER — atualiza invoice.total quando transação é inserida/removida/editada
CREATE OR REPLACE FUNCTION update_invoice_total()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.invoice_id IS NOT NULL THEN
      UPDATE invoices
      SET total = COALESCE((SELECT SUM(amount) FROM transactions WHERE invoice_id = OLD.invoice_id), 0),
          updated_at = now()
      WHERE id = OLD.invoice_id;
    END IF;
    RETURN OLD;
  ELSE
    IF NEW.invoice_id IS NOT NULL THEN
      UPDATE invoices
      SET total = COALESCE((SELECT SUM(amount) FROM transactions WHERE invoice_id = NEW.invoice_id), 0),
          updated_at = now()
      WHERE id = NEW.invoice_id;
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.invoice_id IS NOT NULL AND OLD.invoice_id IS DISTINCT FROM NEW.invoice_id THEN
      UPDATE invoices
      SET total = COALESCE((SELECT SUM(amount) FROM transactions WHERE invoice_id = OLD.invoice_id), 0),
          updated_at = now()
      WHERE id = OLD.invoice_id;
    END IF;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_invoice_total ON transactions;
CREATE TRIGGER trg_update_invoice_total
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION update_invoice_total();

-- RLS
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Políticas usando service_role bypass (padrão do Caixinha, single-user)
DROP POLICY IF EXISTS "service_role_all_credit_cards" ON credit_cards;
CREATE POLICY "service_role_all_credit_cards" ON credit_cards FOR ALL USING (true);

DROP POLICY IF EXISTS "service_role_all_invoices" ON invoices;
CREATE POLICY "service_role_all_invoices" ON invoices FOR ALL USING (true);

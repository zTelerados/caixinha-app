-- ════════════════════════════════════════════════════════════
-- CAIXINHA v8 — Schema Supabase (PostgreSQL)
-- Rodar no SQL Editor do Supabase Dashboard
-- ════════════════════════════════════════════════════════════

-- USERS
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Usuário',
  tone TEXT NOT NULL DEFAULT 'cria',
  month_start_day INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CATEGORIES
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '📌',
  keywords TEXT[] DEFAULT '{}',
  learned_items JSONB DEFAULT '[]',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name)
);

-- TRANSACTIONS (gastos + entradas)
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  payment_method TEXT CHECK (payment_method IN ('Crédito', 'Pix', 'Dinheiro')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  month_label TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TRANSACTION LOG (auditoria)
CREATE TABLE transaction_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- PENDING ACTIONS (pendentes de categoria, tipo, etc)
CREATE TABLE pending_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CONFIG (preferências chave-valor)
CREATE TABLE config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  UNIQUE(user_id, key)
);

-- INDEXES
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_user_month ON transactions(user_id, month_label);
CREATE INDEX idx_transactions_user_type ON transactions(user_id, type);
CREATE INDEX idx_categories_user ON categories(user_id);
CREATE INDEX idx_pending_user ON pending_actions(user_id);
CREATE INDEX idx_pending_expires ON pending_actions(expires_at);

-- AUTO-UPDATE updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ROW LEVEL SECURITY
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- Policies: service_role bypass (backend), anon read own data (dashboard)
CREATE POLICY "Service full access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access" ON transaction_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access" ON pending_actions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access" ON config FOR ALL USING (true) WITH CHECK (true);

-- SEED: Thiago + categorias padrão
INSERT INTO users (phone, name, tone, month_start_day)
VALUES ('whatsapp:+5521995350758', 'Thiago', 'cria', 1)
ON CONFLICT (phone) DO NOTHING;

DO $$
DECLARE
  uid UUID;
BEGIN
  SELECT id INTO uid FROM users WHERE phone = 'whatsapp:+5521995350758';

  INSERT INTO categories (user_id, name, emoji, keywords, sort_order) VALUES
    (uid, 'Mercado', '🛒', ARRAY['mercado','supermercado','hortifruti','feira','sacolão','açougue','rancho'], 1),
    (uid, 'iFood / Restaurante', '🍽️', ARRAY['ifood','restaurante','lanche','almoço','janta','açaí','pizza','hambúrguer','sushi','padaria','café','delivery','comida','pastel','marmita','sorvete','coxinha','mcdonald','burger king','subway','starbucks','bobs'], 2),
    (uid, 'Uber / Transporte', '🚗', ARRAY['uber','transporte','ônibus','metrô','gasolina','99','combustível','estacionamento','pedágio','táxi','brt','bike'], 3),
    (uid, 'Lazer', '🍸', ARRAY['cinema','festa','balada','bar','teatro','show','ingresso','cerveja','chopp','drinks','rolê','after','praia','hotel','viagem','happy hour'], 4),
    (uid, 'Roupa', '🧥', ARRAY['roupa','camiseta','calça','tênis','blusa','sapato','bota','shorts','shopping','jaqueta','moletom','hoodie','cargo','boné','óculos','nike','adidas','jordan','perfume','corrente','relógio','bolsa','mochila'], 5),
    (uid, 'Assinaturas', '📺', ARRAY['netflix','prime','spotify','google','assinatura','disney','hbo','youtube','icloud','streaming','apple','chatgpt','claude','adobe','gamepass'], 6),
    (uid, 'Saúde', '💊', ARRAY['academia','suplemento','whey','creatina','consulta','médico','dentista','farmácia','remédio','exame','vitamina','fisioterapia','terapia','hospital','plano de saúde'], 7),
    (uid, 'Weed', '🌿', ARRAY['weed','erva','beck','flor','maconha','prensado','seda','piteira','dichavador'], 8)
  ON CONFLICT (user_id, name) DO NOTHING;
END $$;

-- Helper: month label from date
CREATE OR REPLACE FUNCTION month_label(d DATE)
RETURNS TEXT AS $$
DECLARE
  months TEXT[] := ARRAY['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
BEGIN
  RETURN months[EXTRACT(MONTH FROM d)::INT];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

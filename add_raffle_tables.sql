-- Raffle feature schema for SingBid
-- Run this in Supabase SQL editor (or psql) after the base schema

-- Tables --------------------------------------------------------------------

-- Core raffles table
CREATE TABLE IF NOT EXISTS raffles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  ticket_price INTEGER NOT NULL CHECK (ticket_price > 0), -- cents
  max_entries INTEGER NOT NULL CHECK (max_entries > 0),
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft','active','ended','cancelled')),
  tickets_sold INTEGER DEFAULT 0 CHECK (tickets_sold >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Images for raffles (separate from auction_images)
CREATE TABLE IF NOT EXISTS raffle_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
  image_url VARCHAR(500) NOT NULL,
  image_path VARCHAR(500),
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  alt_text VARCHAR(255),
  file_size INTEGER,
  mime_type VARCHAR(100),
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchases (payment-intents) for raffle tickets
CREATE TABLE IF NOT EXISTS raffle_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  amount INTEGER NOT NULL CHECK (amount > 0), -- cents
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','requires_action','processing','succeeded','failed','refunded','canceled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Each ticket is an entry (1 row per ticket)
CREATE TABLE IF NOT EXISTS raffle_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purchase_id UUID REFERENCES raffle_purchases(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Draw record (exactly one winner per raffle)
CREATE TABLE IF NOT EXISTS raffle_draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL UNIQUE REFERENCES raffles(id) ON DELETE CASCADE,
  winner_entry_id UUID REFERENCES raffle_entries(id) ON DELETE SET NULL,
  winner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  method VARCHAR(50) DEFAULT 'random',
  seed TEXT,
  drawn_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes -------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_raffles_seller_id ON raffles(seller_id);
CREATE INDEX IF NOT EXISTS idx_raffles_status ON raffles(status);
CREATE INDEX IF NOT EXISTS idx_raffles_end_time ON raffles(end_time);

CREATE INDEX IF NOT EXISTS idx_raffle_images_raffle_id ON raffle_images(raffle_id);
CREATE INDEX IF NOT EXISTS idx_raffle_images_primary ON raffle_images(raffle_id, is_primary);

CREATE INDEX IF NOT EXISTS idx_raffle_purchases_raffle_id ON raffle_purchases(raffle_id);
CREATE INDEX IF NOT EXISTS idx_raffle_purchases_buyer_id ON raffle_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_raffle_purchases_status ON raffle_purchases(status);

CREATE INDEX IF NOT EXISTS idx_raffle_entries_raffle_id ON raffle_entries(raffle_id);
CREATE INDEX IF NOT EXISTS idx_raffle_entries_buyer_id ON raffle_entries(buyer_id);

-- Triggers (reuse update_updated_at_column if present) -----------------------
-- updated_at triggers
DO $$ BEGIN
  CREATE TRIGGER update_raffles_updated_at
    BEFORE UPDATE ON raffles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN undefined_function THEN
  -- base function not defined yet; skip
  NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_raffle_images_updated_at
    BEFORE UPDATE ON raffle_images
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN undefined_function THEN
  NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_raffle_purchases_updated_at
    BEFORE UPDATE ON raffle_purchases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN undefined_function THEN
  NULL;
END $$;

-- Increment tickets_sold on entry insert
CREATE OR REPLACE FUNCTION increment_raffle_tickets()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE raffles
    SET tickets_sold = tickets_sold + 1,
        updated_at   = NOW()
  WHERE id = NEW.raffle_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- End raffle automatically when full
CREATE OR REPLACE FUNCTION end_raffle_if_full()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE raffles
    SET status = 'ended',
        updated_at = NOW()
  WHERE id = NEW.raffle_id
    AND status = 'active'
    AND tickets_sold >= (SELECT max_entries FROM raffles WHERE id = NEW.raffle_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure increment runs before end check (alphabetical trigger names)
DROP TRIGGER IF EXISTS a_increment_raffle_tickets ON raffle_entries;
CREATE TRIGGER a_increment_raffle_tickets
  AFTER INSERT ON raffle_entries
  FOR EACH ROW EXECUTE FUNCTION increment_raffle_tickets();

DROP TRIGGER IF EXISTS b_end_raffle_if_full ON raffle_entries;
CREATE TRIGGER b_end_raffle_if_full
  AFTER INSERT ON raffle_entries
  FOR EACH ROW EXECUTE FUNCTION end_raffle_if_full();

-- Batch function to end expired raffles by time (can be scheduled)
CREATE OR REPLACE FUNCTION end_expired_raffles_raffle()
RETURNS void AS $$
BEGIN
  UPDATE raffles
    SET status = 'ended', updated_at = NOW()
  WHERE status = 'active' AND end_time < NOW();
END;
$$ LANGUAGE plpgsql;

-- Winner selection -----------------------------------------------------------
-- Note: uses random(); acceptable for test mode. Replace with verifiable RNG for prod.
CREATE OR REPLACE FUNCTION draw_raffle_winner(raffle_uuid UUID)
RETURNS UUID AS $$
DECLARE
  winner UUID;
BEGIN
  -- do nothing if already drawn
  IF EXISTS (SELECT 1 FROM raffle_draws WHERE raffle_id = raffle_uuid) THEN
    RETURN (SELECT winner_entry_id FROM raffle_draws WHERE raffle_id = raffle_uuid);
  END IF;

  SELECT id
    INTO winner
  FROM raffle_entries
  WHERE raffle_id = raffle_uuid
  ORDER BY random()
  LIMIT 1;

  IF winner IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO raffle_draws (raffle_id, winner_entry_id, winner_user_id, method)
  SELECT raffle_uuid, e.id, e.buyer_id, 'random'
  FROM raffle_entries e
  WHERE e.id = winner;

  UPDATE raffles SET status = 'ended', updated_at = NOW()
  WHERE id = raffle_uuid AND status <> 'ended';

  RETURN winner;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS -----------------------------------------------------------------------
ALTER TABLE raffles ENABLE ROW LEVEL SECURITY;
ALTER TABLE raffle_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE raffle_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE raffle_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE raffle_draws ENABLE ROW LEVEL SECURITY;

-- Raffles: public read; sellers manage own
CREATE POLICY "Raffles are publicly readable" ON raffles
  FOR SELECT USING (true);

CREATE POLICY "Sellers can insert their own raffles" ON raffles
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own raffles" ON raffles
  FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own raffles" ON raffles
  FOR DELETE USING (auth.uid() = seller_id);

-- Raffle images: public read; seller manage
CREATE POLICY "Raffle images are publicly readable" ON raffle_images
  FOR SELECT USING (true);

CREATE POLICY "Sellers can manage their raffle images" ON raffle_images
  FOR ALL USING (auth.uid() IN (SELECT seller_id FROM raffles WHERE id = raffle_id));

-- Purchases: buyer or seller can read; buyer inserts
CREATE POLICY "Users can view their raffle purchases" ON raffle_purchases
  FOR SELECT USING (
    auth.uid() = buyer_id OR
    auth.uid() IN (SELECT seller_id FROM raffles WHERE id = raffle_id)
  );

CREATE POLICY "Users can create their own raffle purchases" ON raffle_purchases
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Entries: buyer or seller can read; buyer inserts (typically via server)
CREATE POLICY "Users can view raffle entries related to them" ON raffle_entries
  FOR SELECT USING (
    auth.uid() = buyer_id OR
    auth.uid() IN (SELECT seller_id FROM raffles WHERE id = raffle_id)
  );

CREATE POLICY "Users can create their own raffle entries" ON raffle_entries
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Draws: public read; seller writes
CREATE POLICY "Raffle draws are publicly readable" ON raffle_draws
  FOR SELECT USING (true);

CREATE POLICY "Sellers can manage raffle draws" ON raffle_draws
  FOR ALL USING (auth.uid() IN (SELECT seller_id FROM raffles WHERE id = raffle_id));

-- Comments ------------------------------------------------------------------
COMMENT ON TABLE raffles IS 'Raffles listed by sellers';
COMMENT ON TABLE raffle_entries IS 'Individual ticket entries for raffles';
COMMENT ON TABLE raffle_purchases IS 'Payment-intent tracking for raffle tickets';
COMMENT ON TABLE raffle_draws IS 'Recorded draw results per raffle';
COMMENT ON TABLE raffle_images IS 'Images associated with raffles';

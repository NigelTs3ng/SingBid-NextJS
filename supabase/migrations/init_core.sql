-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Auctions table
CREATE TABLE IF NOT EXISTS auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  starting_price DECIMAL(10,2) NOT NULL CHECK (starting_price > 0),
  current_price DECIMAL(10,2) DEFAULT 0,
  end_time TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','ended','cancelled')),
  created_at TIMESTAMP DEFAULT now()
);

-- Bids table
CREATE TABLE IF NOT EXISTS bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID REFERENCES auctions(id) ON DELETE CASCADE,
  bidder_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP DEFAULT now()
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID REFERENCES auctions(id) ON DELETE CASCADE,
  winner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','captured','failed')),
  captured_at TIMESTAMP
);

-- Payouts table
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
  auction_id UUID REFERENCES auctions(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','failed')),
  released_at TIMESTAMP
);

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Auctions policies
CREATE POLICY "Anyone can view active auctions" ON auctions
  FOR SELECT USING (status = 'active' OR seller_id = auth.uid());

CREATE POLICY "Users can create their own auctions" ON auctions
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update their own auctions" ON auctions
  FOR UPDATE USING (auth.uid() = seller_id);

-- Bids policies
CREATE POLICY "Anyone can view bids on active auctions" ON bids
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auctions 
      WHERE auctions.id = bids.auction_id 
      AND auctions.status = 'active'
    )
  );

CREATE POLICY "Authenticated users can place bids" ON bids
  FOR INSERT WITH CHECK (
    auth.uid() = bidder_id 
    AND EXISTS (
      SELECT 1 FROM auctions 
      WHERE auctions.id = auction_id 
      AND auctions.status = 'active'
      AND auctions.end_time > now()
      AND auctions.seller_id != auth.uid()
    )
  );

-- Payments policies
CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT USING (auth.uid() = winner_id);

-- Payouts policies
CREATE POLICY "Users can view their own payouts" ON payouts
  FOR SELECT USING (auth.uid() = seller_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_end_time ON auctions(end_time);
CREATE INDEX IF NOT EXISTS idx_auctions_seller_id ON auctions(seller_id);
CREATE INDEX IF NOT EXISTS idx_bids_auction_id ON bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder_id ON bids(bidder_id);
CREATE INDEX IF NOT EXISTS idx_bids_amount ON bids(amount DESC);
CREATE INDEX IF NOT EXISTS idx_payments_auction_id ON payments(auction_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_intent ON payments(stripe_payment_intent_id);

-- Function to automatically update auction current_price when a new bid is placed
CREATE OR REPLACE FUNCTION update_auction_current_price()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auctions 
  SET current_price = NEW.amount 
  WHERE id = NEW.auction_id 
  AND NEW.amount > current_price;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update current_price on new bids
DROP TRIGGER IF EXISTS trigger_update_current_price ON bids;
CREATE TRIGGER trigger_update_current_price
  AFTER INSERT ON bids
  FOR EACH ROW
  EXECUTE FUNCTION update_auction_current_price();

-- Function to prevent bids on own auctions
CREATE OR REPLACE FUNCTION prevent_self_bidding()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM auctions 
    WHERE id = NEW.auction_id 
    AND seller_id = NEW.bidder_id
  ) THEN
    RAISE EXCEPTION 'Cannot bid on your own auction';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent self-bidding
DROP TRIGGER IF EXISTS trigger_prevent_self_bidding ON bids;
CREATE TRIGGER trigger_prevent_self_bidding
  BEFORE INSERT ON bids
  FOR EACH ROW
  EXECUTE FUNCTION prevent_self_bidding();
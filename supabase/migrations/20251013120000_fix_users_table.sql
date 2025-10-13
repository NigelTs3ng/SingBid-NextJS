-- Fix users table to properly reference auth.users
-- Drop existing foreign key constraints temporarily
ALTER TABLE auctions DROP CONSTRAINT IF EXISTS auctions_seller_id_fkey;
ALTER TABLE bids DROP CONSTRAINT IF EXISTS bids_bidder_id_fkey;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_winner_id_fkey;
ALTER TABLE payouts DROP CONSTRAINT IF EXISTS payouts_seller_id_fkey;

-- Drop existing users table if it exists
DROP TABLE IF EXISTS users CASCADE;

-- Create users table with proper auth integration
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  verified_phone BOOLEAN DEFAULT FALSE,
  rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  total_transactions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Re-add foreign key constraints
ALTER TABLE auctions ADD CONSTRAINT auctions_seller_id_fkey 
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE bids ADD CONSTRAINT bids_bidder_id_fkey 
  FOREIGN KEY (bidder_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE payments ADD CONSTRAINT payments_winner_id_fkey 
  FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE payouts ADD CONSTRAINT payouts_seller_id_fkey 
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE;

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Update users policies to work with auth.uid()
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users only" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to handle user updates
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users 
  SET 
    email = new.email,
    updated_at = now()
  WHERE id = new.id;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to keep user data in sync
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();
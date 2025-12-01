-- SingBid Database Schema for Supabase
-- Run this script in your Supabase SQL editor to create the required tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    stripe_customer_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create auctions table
CREATE TABLE IF NOT EXISTS public.auctions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    starting_price DECIMAL(10,2) NOT NULL CHECK (starting_price > 0),
    current_price DECIMAL(10,2) NOT NULL CHECK (current_price >= starting_price),
    seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'cancelled', 'completed')),
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create auction_images table for storing multiple images per auction
CREATE TABLE IF NOT EXISTS public.auction_images (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    image_path VARCHAR(500), -- Supabase storage path
    display_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    alt_text VARCHAR(255),
    file_size INTEGER, -- File size in bytes
    mime_type VARCHAR(100),
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create seller_accounts table
CREATE TABLE IF NOT EXISTS public.seller_accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    stripe_account_id VARCHAR(255) UNIQUE NOT NULL,
    account_status VARCHAR(20) DEFAULT 'pending' CHECK (account_status IN ('pending', 'active', 'rejected')),
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create bids table
CREATE TABLE IF NOT EXISTS public.bids (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    bidder_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'winning', 'outbid')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.bids
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'card' CHECK (payment_method IN ('card','bidcoin','hybrid')),
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS bidcoin_hold BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS holds_released BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS authorization_status VARCHAR(20) DEFAULT 'authorized',
  ADD COLUMN IF NOT EXISTS authorized_amount DECIMAL(10,2);

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    platform_fee DECIMAL(10,2) NOT NULL CHECK (platform_fee >= 0),
    seller_amount DECIMAL(10,2) NOT NULL CHECK (seller_amount >= 0),
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_transfer_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'card' CHECK (payment_method IN ('card','bidcoin','hybrid')),
  ADD COLUMN IF NOT EXISTS bidcoin_amount BIGINT DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_auctions_seller_id ON public.auctions(seller_id);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON public.auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_end_time ON public.auctions(end_time);
CREATE INDEX IF NOT EXISTS idx_auction_images_auction_id ON public.auction_images(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_images_display_order ON public.auction_images(auction_id, display_order);
CREATE INDEX IF NOT EXISTS idx_auction_images_primary ON public.auction_images(auction_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_bids_auction_id ON public.bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder_id ON public.bids(bidder_id);
CREATE INDEX IF NOT EXISTS idx_payments_buyer_id ON public.payments(buyer_id);
CREATE INDEX IF NOT EXISTS idx_payments_seller_id ON public.payments(seller_id);
CREATE INDEX IF NOT EXISTS idx_payments_auction_id ON public.payments(auction_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_seller_accounts_user_id ON public.seller_accounts(user_id);

-- Referral columns -----------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(16) UNIQUE DEFAULT lower(substr(replace(uuid_generate_v4()::text,'-',''),1,8)),
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS referral_last_attempt_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS pending_referral_code VARCHAR(16),
  ADD COLUMN IF NOT EXISTS user_role VARCHAR(20) DEFAULT 'bidder' CHECK (user_role IN ('bidder','seller'));

UPDATE public.users
SET referral_code = lower(substr(replace(uuid_generate_v4()::text,'-',''),1,8))
WHERE referral_code IS NULL;

ALTER TABLE public.raffle_purchases
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30) DEFAULT 'card';

-- BidCoin tables --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_bidcoins (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    balance BIGINT NOT NULL DEFAULT 0, -- Stored in cents (1 BidCoin = 1 cent)
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bidcoin_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    change BIGINT NOT NULL, -- positive for earn, negative for spend (in cents)
    balance_after BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., signup_bonus, referral, auction_sale, raffle_purchase, plan_purchase
    reference_id UUID,
    reference_table VARCHAR(50),
    usd_value NUMERIC(10,2) GENERATED ALWAYS AS (ROUND(change::numeric / 100, 2)) STORED,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bidcoin_transactions_user_id ON public.bidcoin_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_bidcoin_transactions_type ON public.bidcoin_transactions(type);

CREATE OR REPLACE FUNCTION public.ensure_bidcoin_wallet_exists()
RETURNS TRIGGER AS $$
DECLARE
    v_has_signup_bonus BOOLEAN;
BEGIN
    INSERT INTO public.user_bidcoins(user_id, balance)
    VALUES(NEW.id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT EXISTS (
        SELECT 1
        FROM public.bidcoin_transactions
        WHERE user_id = NEW.id
          AND type = 'signup_bonus'
    )
    INTO v_has_signup_bonus;

    IF NOT v_has_signup_bonus THEN
        PERFORM new_balance
        FROM public.bidcoin_adjust_balance(
            NEW.id,
            200,
            'signup_bonus',
            NULL,
            NULL,
            jsonb_build_object('source', 'auto_signup_bonus')
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_bidcoin_wallet_on_user ON public.users;
CREATE TRIGGER ensure_bidcoin_wallet_on_user
AFTER INSERT ON public.users
FOR EACH ROW EXECUTE FUNCTION public.ensure_bidcoin_wallet_exists();

WITH updated_wallets AS (
    UPDATE public.user_bidcoins ub
    SET balance = ub.balance + 200,
        updated_at = NOW()
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.bidcoin_transactions bt
        WHERE bt.user_id = ub.user_id
          AND bt.type = 'signup_bonus'
    )
    RETURNING user_id, balance AS balance_after
)
INSERT INTO public.bidcoin_transactions(
    user_id,
    change,
    balance_after,
    type,
    reference_id,
    reference_table,
    metadata
)
SELECT
    user_id,
    200,
    balance_after,
    'signup_bonus',
    NULL,
    NULL,
    jsonb_build_object('source', 'signup_backfill')
FROM updated_wallets;

CREATE OR REPLACE FUNCTION public.bidcoin_adjust_balance(
    p_user_id UUID,
    p_change BIGINT,
    p_type VARCHAR,
    p_reference_id UUID DEFAULT NULL,
    p_reference_table VARCHAR DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS TABLE(new_balance BIGINT) AS $$
DECLARE
    v_balance BIGINT;
BEGIN
    PERFORM 1 FROM public.user_bidcoins WHERE user_id = p_user_id FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.user_bidcoins(user_id, balance) VALUES (p_user_id, 0);
    END IF;

    UPDATE public.user_bidcoins
    SET balance = balance + p_change,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING balance INTO v_balance;

    IF v_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient BidCoins';
    END IF;

    INSERT INTO public.bidcoin_transactions(
        user_id,
        change,
        balance_after,
        type,
        reference_id,
        reference_table,
        metadata
    ) VALUES (
        p_user_id,
        p_change,
        v_balance,
        p_type,
        p_reference_id,
        p_reference_table,
        COALESCE(p_metadata, '{}'::jsonb)
    );

    RETURN QUERY SELECT v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auctions_updated_at 
    BEFORE UPDATE ON public.auctions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seller_accounts_updated_at 
    BEFORE UPDATE ON public.seller_accounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON public.payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auction_images_updated_at 
    BEFORE UPDATE ON public.auction_images 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_images ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only read/update their own data
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Auctions are publicly readable, but only sellers can modify their own
CREATE POLICY "Auctions are publicly readable" ON public.auctions
    FOR SELECT USING (true);

CREATE POLICY "Sellers can insert their own auctions" ON public.auctions
    FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own auctions" ON public.auctions
    FOR UPDATE USING (auth.uid() = seller_id);

-- Bids are readable by auction participants, insertable by authenticated users
CREATE POLICY "Users can view bids on their auctions or their own bids" ON public.bids
    FOR SELECT USING (
        auth.uid() = bidder_id OR 
        auth.uid() IN (SELECT seller_id FROM public.auctions WHERE id = auction_id)
    );

CREATE POLICY "Authenticated users can place bids" ON public.bids
    FOR INSERT WITH CHECK (auth.uid() = bidder_id);

-- Payments are only visible to the buyer and seller involved
CREATE POLICY "Users can view their own payments" ON public.payments
    FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Seller accounts are only accessible by the account owner
CREATE POLICY "Users can view their own seller account" ON public.seller_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own seller account" ON public.seller_accounts
    FOR ALL USING (auth.uid() = user_id);

-- Auction images are publicly readable, but only sellers can modify their own
CREATE POLICY "Auction images are publicly readable" ON public.auction_images
    FOR SELECT USING (true);

CREATE POLICY "Sellers can manage their auction images" ON public.auction_images
    FOR ALL USING (
        auth.uid() IN (
            SELECT seller_id FROM public.auctions WHERE id = auction_id
        )
    );

-- Create function to automatically update auction current_price when new bid is placed
CREATE OR REPLACE FUNCTION update_auction_price()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if the new bid is higher than current price
    IF NEW.amount > (SELECT current_price FROM public.auctions WHERE id = NEW.auction_id) THEN
        UPDATE public.auctions 
        SET current_price = NEW.amount, updated_at = NOW()
        WHERE id = NEW.auction_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update auction price on new bids
CREATE TRIGGER update_auction_price_trigger
    AFTER INSERT ON public.bids
    FOR EACH ROW EXECUTE FUNCTION update_auction_price();

-- Create function to end auctions automatically
CREATE OR REPLACE FUNCTION end_expired_auctions()
RETURNS void AS $$
BEGIN
    UPDATE public.auctions 
    SET status = 'ended', updated_at = NOW()
    WHERE status = 'active' AND end_time < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to get highest bidder for an auction
CREATE OR REPLACE FUNCTION get_auction_winner(auction_uuid UUID)
RETURNS TABLE(bidder_id UUID, amount DECIMAL) AS $$
BEGIN
    RETURN QUERY
    SELECT b.bidder_id, b.amount
    FROM public.bids b
    WHERE b.auction_id = auction_uuid 
      AND b.status = 'active'
    ORDER BY b.amount DESC, b.created_at ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to ensure only one primary image per auction
CREATE OR REPLACE FUNCTION ensure_single_primary_image()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting this image as primary, unset all other primary images for this auction
    IF NEW.is_primary = TRUE THEN
        UPDATE public.auction_images 
        SET is_primary = FALSE 
        WHERE auction_id = NEW.auction_id AND id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure only one primary image per auction
CREATE TRIGGER ensure_single_primary_image_trigger
    BEFORE INSERT OR UPDATE ON public.auction_images
    FOR EACH ROW
    WHEN (NEW.is_primary = TRUE)
    EXECUTE FUNCTION ensure_single_primary_image();

-- Function to get auction with images
CREATE OR REPLACE FUNCTION get_auction_with_images(auction_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'auction', to_json(a.*),
        'images', COALESCE(json_agg(
            json_build_object(
                'id', ai.id,
                'image_url', ai.image_url,
                'image_path', ai.image_path,
                'display_order', ai.display_order,
                'is_primary', ai.is_primary,
                'alt_text', ai.alt_text,
                'file_size', ai.file_size,
                'mime_type', ai.mime_type,
                'width', ai.width,
                'height', ai.height
            ) ORDER BY ai.display_order, ai.created_at
        ), '[]'::json)
    )
    INTO result
    FROM public.auctions a
    LEFT JOIN public.auction_images ai ON a.id = ai.auction_id
    WHERE a.id = auction_uuid
    GROUP BY a.id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    v_has_signup_bonus BOOLEAN;
    v_pending_referral VARCHAR(16);
    v_referrer_id UUID;
    v_user_role VARCHAR(20);
BEGIN
    v_pending_referral := NULLIF(trim(NEW.raw_user_meta_data->>'pending_referral_code'), '');
    IF v_pending_referral IS NOT NULL THEN
        v_pending_referral := lower(v_pending_referral);
    END IF;

    v_user_role := lower(NULLIF(trim(NEW.raw_user_meta_data->>'user_role'), ''));
    IF v_user_role NOT IN ('seller', 'bidder') THEN
        v_user_role := 'bidder';
    END IF;

    INSERT INTO public.users (id, email, name, pending_referral_code, user_role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        v_pending_referral,
        v_user_role
    )
    ON CONFLICT (id) DO UPDATE
    SET pending_referral_code = EXCLUDED.pending_referral_code,
        user_role = EXCLUDED.user_role;

    SELECT EXISTS (
        SELECT 1
        FROM public.bidcoin_transactions
        WHERE user_id = NEW.id
          AND type = 'signup_bonus'
    )
    INTO v_has_signup_bonus;

    IF NOT v_has_signup_bonus THEN
        BEGIN
            PERFORM new_balance
            FROM public.bidcoin_adjust_balance(
                NEW.id,
                200,
                'signup_bonus',
                NULL,
                NULL,
                jsonb_build_object('source', 'auth_trigger_bonus')
            );
        EXCEPTION
            WHEN others THEN
                RAISE NOTICE 'Failed to award signup bonus for user %: %', NEW.id, SQLERRM;
        END;
    END IF;

    IF v_pending_referral IS NOT NULL THEN
        BEGIN
            SELECT id
            INTO v_referrer_id
            FROM public.users
            WHERE referral_code = v_pending_referral
            LIMIT 1;

            IF FOUND AND v_referrer_id IS NOT NULL AND v_referrer_id <> NEW.id THEN
                UPDATE public.users
                SET referred_by = COALESCE(referred_by, v_referrer_id),
                    referral_last_attempt_at = NOW(),
                    pending_referral_code = NULL
                WHERE id = NEW.id;

                BEGIN
                    PERFORM new_balance
                    FROM public.bidcoin_adjust_balance(
                        v_referrer_id,
                        200,
                        'referral',
                        NEW.id,
                        'users',
                        jsonb_build_object('direction', 'referrer', 'code', v_pending_referral)
                    );
                EXCEPTION
                    WHEN others THEN
                        RAISE NOTICE 'Failed to award referral bonus to referrer %: %', v_referrer_id, SQLERRM;
                END;

                BEGIN
                    PERFORM new_balance
                    FROM public.bidcoin_adjust_balance(
                        NEW.id,
                        200,
                        'referral',
                        v_referrer_id,
                        'users',
                        jsonb_build_object('direction', 'referee', 'code', v_pending_referral)
                    );
                EXCEPTION
                    WHEN others THEN
                        RAISE NOTICE 'Failed to award referral bonus to new user %: %', NEW.id, SQLERRM;
                END;
            ELSE
                UPDATE public.users
                SET pending_referral_code = NULL
                WHERE id = NEW.id;
            END IF;
        EXCEPTION
            WHEN others THEN
                RAISE NOTICE 'Failed to process referral for user %: %', NEW.id, SQLERRM;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert sample data (optional - remove if not needed)
-- INSERT INTO public.users (id, email, name) VALUES 
--     ('550e8400-e29b-41d4-a716-446655440001', 'seller@example.com', 'John Seller'),
--     ('550e8400-e29b-41d4-a716-446655440002', 'buyer@example.com', 'Jane Buyer');

COMMENT ON TABLE public.users IS 'User accounts with Stripe customer integration';
COMMENT ON TABLE public.auctions IS 'Auction items with pricing and timing information';
COMMENT ON TABLE public.bids IS 'Bids placed on auctions';
COMMENT ON TABLE public.payments IS 'Payment records linking to Stripe payment intents';
COMMENT ON TABLE public.seller_accounts IS 'Stripe connected accounts for sellers';
COMMENT ON TABLE public.auction_images IS 'Images associated with auction items';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- End of schema script
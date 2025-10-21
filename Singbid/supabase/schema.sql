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
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'cancelled')),
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
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'winning')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    platform_fee DECIMAL(10,2) NOT NULL CHECK (platform_fee >= 0),
    seller_amount DECIMAL(10,2) NOT NULL CHECK (seller_amount >= 0),
    stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_transfer_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
BEGIN
    INSERT INTO public.users (id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
    );
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        -- If there's an error (like duplicate), just return NEW to not block the signup
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
-- =================================================
-- SingBid Complete Database Schema for Supabase
-- Compatible with PostgreSQL + Additional Integration Columns
-- Run this script in your Supabase SQL Editor
-- =================================================

-- ===================== ENABLE EXTENSIONS =====================
-- Enable necessary PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===================== USERS & PROFILES =====================
-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20),
    email VARCHAR(255) UNIQUE,
    kyc_status VARCHAR(20) DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    is_pro BOOLEAN DEFAULT FALSE,
    subscription_plan VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User profiles with extended information
CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    profile_image TEXT,
    bio TEXT,
    rating_average DECIMAL(3,2) DEFAULT 0 CHECK (rating_average >= 0 AND rating_average <= 5),
    rating_count INT DEFAULT 0 CHECK (rating_count >= 0),
    followers_count INT DEFAULT 0 CHECK (followers_count >= 0),
    following_count INT DEFAULT 0 CHECK (following_count >= 0),
    badges TEXT[],
    location VARCHAR(100),
    preferred_language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'Asia/Singapore',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ===================== SUBSCRIPTIONS =====================
-- Subscription plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    monthly_fee DECIMAL(10,2) NOT NULL CHECK (monthly_fee >= 0),
    platform_fee_rate DECIMAL(5,2) DEFAULT 5.00 CHECK (platform_fee_rate >= 0 AND platform_fee_rate <= 100),
    benefits TEXT[],
    max_active_auctions INT,
    featured_listings_per_month INT DEFAULT 0,
    priority_support BOOLEAN DEFAULT FALSE,
    analytics_access BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    plan_name VARCHAR(50),
    price DECIMAL(10,2),
    start_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    end_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired', 'suspended')),
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    auto_renew BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ===================== AUCTION EVENTS =====================
-- Scheduled auction events (for bulk auctions)
CREATE TABLE IF NOT EXISTS public.auction_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_start TIMESTAMP WITH TIME ZONE,
    scheduled_end TIMESTAMP WITH TIME ZONE,
    min_items INT DEFAULT 10 CHECK (min_items > 0),
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'canceled')),
    banner_image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ===================== AUCTIONS =====================
-- Main auctions table with all required fields
CREATE TABLE IF NOT EXISTS public.auctions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- Pricing
    reserve DECIMAL(10,2) DEFAULT 0 CHECK (reserve >= 0),
    starting_bid DECIMAL(10,2) DEFAULT 0 CHECK (starting_bid >= 0),
    bid_increment DECIMAL(10,2) DEFAULT 1.00 CHECK (bid_increment > 0),
    buy_now_price DECIMAL(10,2) CHECK (buy_now_price > 0),
    
    -- Timing
    start_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Item details
    category VARCHAR(100) NOT NULL,
    condition VARCHAR(50) CHECK (condition IN ('new', 'like_new', 'excellent', 'good', 'fair', 'poor')),
    brand VARCHAR(100),
    model VARCHAR(100),
    
    -- Images
    image_url TEXT,
    image_urls JSONB DEFAULT '[]'::jsonb,
    
    -- Shipping & Location
    location VARCHAR(100) DEFAULT 'Singapore',
    shipping_method VARCHAR(50) CHECK (shipping_method IN ('pickup', 'local', 'nationwide', 'both')),
    shipping_cost DECIMAL(10,2) CHECK (shipping_cost >= 0),
    shipping_included BOOLEAN DEFAULT FALSE,
    shipping_notes TEXT,
    
    -- Policies
    return_policy TEXT,
    return_conditions TEXT,
    
    -- Requirements
    require_verified_phone BOOLEAN DEFAULT FALSE,
    require_min_rating BOOLEAN DEFAULT FALSE,
    min_rating DECIMAL(3,2) DEFAULT 0 CHECK (min_rating >= 0 AND min_rating <= 5),
    block_unpaid_buyers BOOLEAN DEFAULT FALSE,
    additional_requirements TEXT,
    
    -- Status & Metadata
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'canceled', 'suspended')),
    event_id uuid REFERENCES public.auction_events(id) ON DELETE SET NULL,
    scheduled BOOLEAN DEFAULT FALSE,
    featured BOOLEAN DEFAULT FALSE,
    views INT DEFAULT 0 CHECK (views >= 0),
    watchers_count INT DEFAULT 0 CHECK (watchers_count >= 0),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Constraints
    CONSTRAINT valid_timing CHECK (end_at > start_at),
    CONSTRAINT valid_buy_now CHECK (buy_now_price IS NULL OR buy_now_price > GREATEST(reserve, starting_bid))
);

-- ===================== BIDS & BIDDING =====================
-- Bids table (removed the problematic exclusion constraint)
CREATE TABLE IF NOT EXISTS public.bids (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id uuid REFERENCES public.auctions(id) ON DELETE CASCADE,
    bidder_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    is_auto_bid BOOLEAN DEFAULT FALSE,
    max_auto_bid DECIMAL(10,2),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Auto-bidding settings
CREATE TABLE IF NOT EXISTS public.auto_bids (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id uuid REFERENCES public.auctions(id) ON DELETE CASCADE,
    bidder_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    max_amount DECIMAL(10,2) NOT NULL CHECK (max_amount > 0),
    increment DECIMAL(10,2) NOT NULL CHECK (increment > 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    UNIQUE(auction_id, bidder_id)
);

-- Auction outcomes/results
CREATE TABLE IF NOT EXISTS public.outcomes (
    auction_id uuid PRIMARY KEY REFERENCES public.auctions(id) ON DELETE CASCADE,
    winner_id uuid REFERENCES public.users(id),
    final_price DECIMAL(10,2),
    winning_bid_id uuid REFERENCES public.bids(id),
    payment_intent_id TEXT,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    captured_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ===================== PAYMENTS & FINANCIAL =====================
-- Payment transactions
CREATE TABLE IF NOT EXISTS public.payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    auction_id uuid REFERENCES public.auctions(id) ON DELETE SET NULL,
    intent_id TEXT UNIQUE,
    stripe_payment_intent_id TEXT,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'SGD',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled')),
    fee_applied DECIMAL(5,2) DEFAULT 0 CHECK (fee_applied >= 0),
    platform_fee DECIMAL(10,2) DEFAULT 0 CHECK (platform_fee >= 0),
    subscription_discount DECIMAL(5,2) DEFAULT 0 CHECK (subscription_discount >= 0),
    payment_method VARCHAR(50),
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Seller payouts
CREATE TABLE IF NOT EXISTS public.payouts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    auction_id uuid REFERENCES public.auctions(id) ON DELETE CASCADE,
    payment_id uuid REFERENCES public.payments(id),
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    status VARCHAR(20) DEFAULT 'on_hold' CHECK (status IN ('on_hold', 'processing', 'paid', 'failed', 'canceled')),
    stripe_transfer_id TEXT,
    released_at TIMESTAMP WITH TIME ZONE,
    hold_expires_at TIMESTAMP WITH TIME ZONE,
    hold_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Disputes and resolution
CREATE TABLE IF NOT EXISTS public.disputes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id uuid REFERENCES public.auctions(id) ON DELETE CASCADE,
    opener_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    respondent_id uuid REFERENCES public.users(id),
    reason TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'other' CHECK (category IN ('item_not_received', 'item_not_as_described', 'payment_issue', 'shipping_issue', 'other')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
    resolution TEXT,
    resolved_by uuid REFERENCES public.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    evidence_urls JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ===================== SOCIAL & RATINGS =====================
-- User ratings and reviews
CREATE TABLE IF NOT EXISTS public.ratings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id uuid REFERENCES public.auctions(id) ON DELETE CASCADE,
    reviewer_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    target_user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Ensure one review per auction per reviewer
    UNIQUE(auction_id, reviewer_id, target_user_id)
);

-- User followers/following system
CREATE TABLE IF NOT EXISTS public.followers (
    follower_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    followed_user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    PRIMARY KEY (follower_id, followed_user_id),
    -- Prevent self-following
    CONSTRAINT no_self_follow CHECK (follower_id != followed_user_id)
);

-- Auction watchers (users watching specific auctions)
CREATE TABLE IF NOT EXISTS public.auction_watchers (
    auction_id uuid REFERENCES public.auctions(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    PRIMARY KEY (auction_id, user_id)
);

-- ===================== NOTIFICATIONS =====================
-- User notifications system
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    message TEXT NOT NULL,
    link TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Notification preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    email_new_bid BOOLEAN DEFAULT TRUE,
    email_outbid BOOLEAN DEFAULT TRUE,
    email_auction_ending BOOLEAN DEFAULT TRUE,
    email_auction_won BOOLEAN DEFAULT TRUE,
    email_payment_received BOOLEAN DEFAULT TRUE,
    push_new_bid BOOLEAN DEFAULT TRUE,
    push_outbid BOOLEAN DEFAULT TRUE,
    push_auction_ending BOOLEAN DEFAULT TRUE,
    sms_auction_won BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ===================== INDEXES FOR PERFORMANCE =====================
-- Auctions indexes
CREATE INDEX IF NOT EXISTS idx_auctions_seller ON public.auctions(seller_id);
CREATE INDEX IF NOT EXISTS idx_auctions_category ON public.auctions(category);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON public.auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_end_at ON public.auctions(end_at);
CREATE INDEX IF NOT EXISTS idx_auctions_location ON public.auctions(location);
CREATE INDEX IF NOT EXISTS idx_auctions_featured ON public.auctions(featured) WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_auctions_search ON public.auctions USING gin(to_tsvector('english', title || ' ' || description));

-- Bids indexes
CREATE INDEX IF NOT EXISTS idx_bids_auction ON public.bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder ON public.bids(bidder_id);
CREATE INDEX IF NOT EXISTS idx_bids_auction_amount ON public.bids(auction_id, amount DESC);
CREATE INDEX IF NOT EXISTS idx_bids_created_at ON public.bids(created_at DESC);

-- Users and profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_rating ON public.user_profiles(rating_average DESC);

-- Other important indexes
CREATE INDEX IF NOT EXISTS idx_outcomes_winner ON public.outcomes(winner_id);
CREATE INDEX IF NOT EXISTS idx_payouts_seller ON public.payouts(seller_id);
CREATE INDEX IF NOT EXISTS idx_ratings_target ON public.ratings(target_user_id);
CREATE INDEX IF NOT EXISTS idx_followers_user ON public.followers(followed_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- ===================== ROW LEVEL SECURITY (RLS) =====================
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ===================== RLS POLICIES =====================
-- Users policies
CREATE POLICY "Users can view their own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- User profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auctions policies
CREATE POLICY "Anyone can view active auctions" ON public.auctions
    FOR SELECT USING (status IN ('active', 'completed'));

CREATE POLICY "Sellers can view their own auctions" ON public.auctions
    FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Authenticated users can create auctions" ON public.auctions
    FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own auctions" ON public.auctions
    FOR UPDATE USING (auth.uid() = seller_id);

-- Bids policies
CREATE POLICY "Anyone can view bids" ON public.bids
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can place bids" ON public.bids
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = bidder_id);

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Followers policies
CREATE POLICY "Anyone can view followers" ON public.followers
    FOR SELECT USING (true);

CREATE POLICY "Users can follow others" ON public.followers
    FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow others" ON public.followers
    FOR DELETE USING (auth.uid() = follower_id);

-- Payments policies (restrict to owners and admin)
CREATE POLICY "Users can view their own payments" ON public.payments
    FOR SELECT USING (auth.uid() = user_id);

-- ===================== STORAGE SETUP =====================
-- Create storage bucket for auction images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('auction-images', 'auction-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public read access for auction images" ON storage.objects
    FOR SELECT USING (bucket_id = 'auction-images');

CREATE POLICY "Authenticated users can upload images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'auction-images' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can update their own images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'auction-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'auction-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- ===================== DEFAULT SUBSCRIPTION PLANS =====================
-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, display_name, monthly_fee, platform_fee_rate, benefits, max_active_auctions, featured_listings_per_month) 
VALUES 
    ('free', 'Free Plan', 0.00, 5.00, ARRAY['Basic auction creation', 'Standard support'], 5, 0),
    ('pro', 'Pro Plan', 29.99, 3.50, ARRAY['Unlimited auctions', 'Featured listings', 'Priority support', 'Analytics'], NULL, 5),
    ('premium', 'Premium Plan', 99.99, 2.00, ARRAY['Everything in Pro', 'Dedicated support', 'Advanced analytics', 'Custom branding'], NULL, 20)
ON CONFLICT (name) DO NOTHING;

-- ===================== FUNCTIONS & TRIGGERS =====================
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_auctions_updated_at BEFORE UPDATE ON public.auctions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to prevent self-bidding (replaces the exclusion constraint)
CREATE OR REPLACE FUNCTION prevent_self_bidding()
RETURNS TRIGGER AS $$
DECLARE
    auction_seller_id uuid;
BEGIN
    -- Get the seller_id of the auction
    SELECT seller_id INTO auction_seller_id
    FROM auctions 
    WHERE id = NEW.auction_id;
    
    -- Check if bidder is the seller
    IF auction_seller_id = NEW.bidder_id THEN
        RAISE EXCEPTION 'Users cannot bid on their own auctions';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent self-bidding
CREATE TRIGGER trigger_prevent_self_bidding
    BEFORE INSERT ON bids
    FOR EACH ROW
    EXECUTE FUNCTION prevent_self_bidding();

-- Function to notify on new bids
CREATE OR REPLACE FUNCTION notify_new_bid()
RETURNS TRIGGER AS $$
DECLARE
    auction_seller_id uuid;
    auction_title text;
    previous_bidder_id uuid;
BEGIN
    -- Get auction details
    SELECT seller_id, title INTO auction_seller_id, auction_title
    FROM auctions WHERE id = NEW.auction_id;
    
    -- Get previous highest bidder (if any)
    SELECT bidder_id INTO previous_bidder_id
    FROM bids 
    WHERE auction_id = NEW.auction_id 
    AND id != NEW.id 
    ORDER BY amount DESC, created_at DESC 
    LIMIT 1;
    
    -- Notify seller of new bid
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
        auction_seller_id,
        'new_bid',
        'New Bid on Your Auction',
        'New bid of $' || NEW.amount || ' placed on "' || auction_title || '"',
        '/auction-details/' || NEW.auction_id
    );
    
    -- Notify previous bidder that they were outbid
    IF previous_bidder_id IS NOT NULL AND previous_bidder_id != NEW.bidder_id THEN
        INSERT INTO notifications (user_id, type, title, message, link)
        VALUES (
            previous_bidder_id,
            'outbid',
            'You Have Been Outbid',
            'Someone placed a higher bid on "' || auction_title || '"',
            '/auction-details/' || NEW.auction_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for bid notifications
CREATE TRIGGER trigger_notify_new_bid
    AFTER INSERT ON bids
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_bid();

-- Function to update user rating after new rating
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE user_profiles 
    SET 
        rating_average = (
            SELECT AVG(rating)::numeric(3,2) 
            FROM ratings 
            WHERE target_user_id = NEW.target_user_id
        ),
        rating_count = (
            SELECT COUNT(*) 
            FROM ratings 
            WHERE target_user_id = NEW.target_user_id
        )
    WHERE user_id = NEW.target_user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for rating updates
CREATE TRIGGER trigger_update_user_rating
    AFTER INSERT OR UPDATE OR DELETE ON ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_rating();

-- ===================== AUTO USER CREATION =====================
-- Function to automatically create user records when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.users table
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert into user_profiles table with basic info
  INSERT INTO public.user_profiles (
    user_id,
    username,
    first_name,
    last_name,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically call the function when a user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policies to allow the trigger function to work
-- Add policy to allow inserts during user creation
CREATE POLICY "Allow user creation during signup" ON public.users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow profile creation during signup" ON public.user_profiles
    FOR INSERT WITH CHECK (true);

-- ===================== END AUTO USER CREATION =====================

-- ============================================================
-- END OF SINGBID COMPLETE DATABASE SCHEMA
-- ============================================================

-- Final success message
DO $$
BEGIN
    RAISE NOTICE 'SingBid database schema created successfully!';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Enable Realtime for tables: auctions, bids, notifications';
    RAISE NOTICE '2. Configure your environment variables with Supabase credentials';
    RAISE NOTICE '3. Test authentication and basic CRUD operations';
    RAISE NOTICE '4. Self-bidding prevention is now handled by trigger instead of constraint';
END
$$;
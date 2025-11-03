-- Payment System Database Schema for SingBid

-- Add Stripe fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255); -- For sellers (Stripe Connect)
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT FALSE;

-- Payment methods table (for bidders)
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_payment_method_id VARCHAR(255) NOT NULL,
    card_brand VARCHAR(50),
    card_last4 VARCHAR(4),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment holds table (for bid authorizations)
CREATE TABLE IF NOT EXISTS payment_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bid_id UUID NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
    auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    bidder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_payment_intent_id VARCHAR(255) NOT NULL,
    amount INTEGER NOT NULL, -- Amount in cents
    status VARCHAR(50) DEFAULT 'requires_confirmation', -- requires_confirmation, requires_action, processing, succeeded, canceled
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table (for completed transactions)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id UUID NOT NULL REFERENCES auctions(id),
    winner_id UUID NOT NULL REFERENCES users(id),
    seller_id UUID NOT NULL REFERENCES users(id),
    stripe_payment_intent_id VARCHAR(255) NOT NULL,
    total_amount INTEGER NOT NULL, -- Total bid amount in cents
    platform_fee INTEGER NOT NULL, -- 5% platform fee in cents  
    seller_amount INTEGER NOT NULL, -- Amount transferred to seller in cents
    stripe_transfer_id VARCHAR(255), -- Stripe transfer ID to seller
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed, refunded
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_holds_bid_id ON payment_holds(bid_id);
CREATE INDEX IF NOT EXISTS idx_payment_holds_auction_id ON payment_holds(auction_id);
CREATE INDEX IF NOT EXISTS idx_payment_holds_bidder_id ON payment_holds(bidder_id);
CREATE INDEX IF NOT EXISTS idx_payments_auction_id ON payments(auction_id);
CREATE INDEX IF NOT EXISTS idx_payments_winner_id ON payments(winner_id);
CREATE INDEX IF NOT EXISTS idx_payments_seller_id ON payments(seller_id);

-- Row Level Security (RLS) policies
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can only see their own payment methods
CREATE POLICY payment_methods_user_policy ON payment_methods
    FOR ALL USING (user_id = auth.uid());

-- Users can only see payment holds related to their bids
CREATE POLICY payment_holds_bidder_policy ON payment_holds
    FOR ALL USING (bidder_id = auth.uid());

-- Users can see payments where they are winner or seller
CREATE POLICY payments_user_policy ON payments
    FOR SELECT USING (winner_id = auth.uid() OR seller_id = auth.uid());
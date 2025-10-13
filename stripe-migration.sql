-- =================================================
-- STRIPE PAYMENT MIGRATION SCRIPT WITH BID PRE-AUTHORIZATION
-- Migrates existing SingBid schema to support Stripe payment flow
-- Safe to run - preserves all existing data
-- =================================================

-- ===================== ADD STRIPE COLUMNS TO EXISTING TABLES =====================

-- Add Stripe columns to users table
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT FALSE;

-- Add Stripe columns to payments table  
ALTER TABLE public.payments 
  ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT,
  ADD COLUMN IF NOT EXISTS capture_method VARCHAR(20) DEFAULT 'automatic',
  ADD COLUMN IF NOT EXISTS application_fee_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_step VARCHAR(20) DEFAULT 'pre_authorized',
  ADD COLUMN IF NOT EXISTS platform_fee_rate DECIMAL(5,2) DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS platform_fee_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_fee_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pre_authorized_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS captured_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS escrowed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS release_scheduled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS released_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS payment_method_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_method_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS last_four VARCHAR(4),
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add additional Stripe columns to payouts table
ALTER TABLE public.payouts 
  ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT,
  ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMPTZ DEFAULT (now() + interval '5 days'),
  ADD COLUMN IF NOT EXISTS hold_reason TEXT DEFAULT 'buyer_protection',
  ADD COLUMN IF NOT EXISTS gross_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS stripe_fee DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS stripe_payout_id TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS destination_account TEXT,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Update disputes table with new Stripe-related fields
ALTER TABLE public.disputes 
  ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS resolution_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS messages JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS stripe_dispute_id TEXT,
  ADD COLUMN IF NOT EXISTS response_due_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP WITH TIME ZONE;

-- ===================== ADD CHECK CONSTRAINTS =====================

-- Add check constraints for new payment steps
DO $$
BEGIN
    -- Add payment step constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'payments_payment_step_check'
    ) THEN
        ALTER TABLE public.payments 
        ADD CONSTRAINT payments_payment_step_check 
        CHECK (payment_step IN ('pre_authorized', 'captured', 'in_escrow', 'released', 'disputed', 'completed'));
    END IF;
    
    -- Add dispute type constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'disputes_type_check'
    ) THEN
        ALTER TABLE public.disputes 
        ADD CONSTRAINT disputes_type_check 
        CHECK (type IN ('item_not_received', 'item_not_as_described', 'payment_issue', 
                       'shipping_issue', 'fraudulent_activity', 'general'));
    END IF;
    
    -- Add dispute resolution type constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'disputes_resolution_type_check'
    ) THEN
        ALTER TABLE public.disputes 
        ADD CONSTRAINT disputes_resolution_type_check 
        CHECK (resolution_type IN ('refund_buyer', 'release_to_seller', 'partial_refund', 'no_action'));
    END IF;
    
    -- Update dispute status constraint to include new statuses
    ALTER TABLE public.disputes DROP CONSTRAINT IF EXISTS disputes_status_check;
    ALTER TABLE public.disputes 
    ADD CONSTRAINT disputes_status_check 
    CHECK (status IN ('open', 'investigating', 'awaiting_response', 'resolved', 'closed'));
    
    -- Update payment status constraint to include new statuses
    ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
    ALTER TABLE public.payments 
    ADD CONSTRAINT payments_status_check 
    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled', 
                     'requires_confirmation', 'requires_action', 'requires_capture'));
    
    -- Update payout status constraint to include new statuses
    ALTER TABLE public.payouts DROP CONSTRAINT IF EXISTS payouts_status_check;
    ALTER TABLE public.payouts 
    ADD CONSTRAINT payouts_status_check 
    CHECK (status IN ('on_hold', 'processing', 'paid', 'failed', 'canceled', 'pending', 'reversed'));
    
END $$;

-- ===================== CREATE NEW TABLES FOR STRIPE FUNCTIONALITY =====================

-- Create escrow holds table
CREATE TABLE IF NOT EXISTS public.escrow_holds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id uuid REFERENCES public.payments(id) ON DELETE CASCADE,
    auction_id uuid REFERENCES public.auctions(id) ON DELETE CASCADE,
    
    -- Hold details
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) DEFAULT 'active' CHECK (
        status IN ('active', 'released', 'disputed', 'expired')
    ),
    
    -- Timing
    hold_until TIMESTAMP WITH TIME ZONE NOT NULL, -- 5 days from capture
    auto_release BOOLEAN DEFAULT TRUE,
    
    -- Release conditions
    buyer_confirmed BOOLEAN DEFAULT FALSE,
    buyer_confirmed_at TIMESTAMP WITH TIME ZONE,
    dispute_opened BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    release_reason TEXT,
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create delivery confirmations table
CREATE TABLE IF NOT EXISTS public.delivery_confirmations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id uuid REFERENCES public.auctions(id) ON DELETE CASCADE,
    buyer_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    seller_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Confirmation details
    confirmed BOOLEAN DEFAULT FALSE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    
    -- Delivery info
    tracking_number TEXT,
    delivery_method VARCHAR(50),
    delivery_notes TEXT,
    
    -- Photo proof
    delivery_photos JSONB DEFAULT '[]'::jsonb,
    
    -- Auto-confirmation
    auto_confirm_at TIMESTAMP WITH TIME ZONE, -- 5 days after delivery
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Stripe connected accounts table
CREATE TABLE IF NOT EXISTS public.stripe_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    
    -- Stripe account details
    stripe_account_id TEXT UNIQUE NOT NULL,
    account_type VARCHAR(20) DEFAULT 'express' CHECK (
        account_type IN ('express', 'custom', 'standard')
    ),
    
    -- Account status
    details_submitted BOOLEAN DEFAULT FALSE,
    payouts_enabled BOOLEAN DEFAULT FALSE,
    charges_enabled BOOLEAN DEFAULT FALSE,
    
    -- Verification status  
    verification_status VARCHAR(20) DEFAULT 'unverified' CHECK (
        verification_status IN ('unverified', 'pending', 'verified', 'rejected')
    ),
    
    -- Requirements
    requirements_pending JSONB DEFAULT '[]'::jsonb,
    requirements_eventually_due JSONB DEFAULT '[]'::jsonb,
    requirements_currently_due JSONB DEFAULT '[]'::jsonb,
    
    -- Country and currency
    country VARCHAR(2) DEFAULT 'SG',
    default_currency VARCHAR(3) DEFAULT 'SGD',
    
    -- Metadata
    business_type VARCHAR(50),
    business_name TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create payment step logs table for debugging and compliance
CREATE TABLE IF NOT EXISTS public.payment_step_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id uuid REFERENCES public.payments(id) ON DELETE CASCADE,
    
    -- Step details
    step VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL,
    
    -- Stripe data
    stripe_event_id TEXT,
    stripe_response JSONB,
    
    -- Error handling
    error_message TEXT,
    retry_count INT DEFAULT 0,
    
    -- Processing details
    processed_by TEXT, -- 'system', 'webhook', 'manual'
    processing_time_ms INT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create bid pre-authorizations table
CREATE TABLE IF NOT EXISTS public.bid_pre_authorizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id uuid REFERENCES public.auctions(id) ON DELETE CASCADE,
    bidder_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Stripe data
    stripe_payment_intent_id TEXT UNIQUE NOT NULL,
    stripe_payment_method_id TEXT,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'SGD',
    
    -- Status and lifecycle
    status VARCHAR(20) DEFAULT 'active' CHECK (
        status IN ('active', 'used', 'canceled', 'expired', 'failed')
    ),
    
    -- Timing
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    failure_reason TEXT,
    stripe_error_code VARCHAR(50),
    requires_action BOOLEAN DEFAULT FALSE,
    client_secret TEXT,
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create outbid cleanup table (track canceled pre-auths when users get outbid)
CREATE TABLE IF NOT EXISTS public.outbid_cleanups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id uuid REFERENCES public.auctions(id) ON DELETE CASCADE,
    outbid_bidder_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    new_highest_bidder_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Pre-auth that was canceled
    canceled_preauth_id uuid REFERENCES public.bid_pre_authorizations(id),
    previous_bid_amount DECIMAL(10,2),
    new_bid_amount DECIMAL(10,2),
    
    -- Stripe cleanup status
    stripe_canceled BOOLEAN DEFAULT FALSE,
    stripe_cancel_error TEXT,
    
    -- Processing
    processed_at TIMESTAMP WITH TIME ZONE,
    retry_count INT DEFAULT 0,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create auction winners table (for final payment processing)
CREATE TABLE IF NOT EXISTS public.auction_winners (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id uuid REFERENCES public.auctions(id) ON DELETE CASCADE UNIQUE,
    winner_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    winning_bid_id uuid REFERENCES public.bids(id) ON DELETE CASCADE,
    
    -- Pre-auth conversion
    preauth_id uuid REFERENCES public.bid_pre_authorizations(id),
    final_payment_intent_id TEXT, -- New PaymentIntent or converted from pre-auth
    
    -- Amounts
    winning_amount DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) NOT NULL,
    seller_amount DECIMAL(10,2) NOT NULL,
    
    -- Status tracking
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (
        payment_status IN ('pending', 'captured', 'failed', 'refunded')
    ),
    
    -- Timing
    determined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    payment_captured_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ===================== CREATE INDEXES FOR PERFORMANCE =====================

-- Payment indexes
CREATE INDEX IF NOT EXISTS idx_payments_stripe_intent ON public.payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_status ON public.payments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_auction ON public.payments(auction_id);
CREATE INDEX IF NOT EXISTS idx_payments_step ON public.payments(payment_step);

-- Escrow indexes
CREATE INDEX IF NOT EXISTS idx_escrow_holds_payment ON public.escrow_holds(payment_id);
CREATE INDEX IF NOT EXISTS idx_escrow_holds_status ON public.escrow_holds(status);
CREATE INDEX IF NOT EXISTS idx_escrow_holds_auto_release ON public.escrow_holds(hold_until) WHERE auto_release = true AND status = 'active';

-- Payout indexes
CREATE INDEX IF NOT EXISTS idx_payouts_seller ON public.payouts(seller_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_scheduled ON public.payouts(scheduled_for) WHERE status = 'pending';

-- Stripe account indexes
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_user ON public.stripe_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_stripe_id ON public.stripe_accounts(stripe_account_id);

-- Step logs indexes
CREATE INDEX IF NOT EXISTS idx_payment_step_logs_payment ON public.payment_step_logs(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_step_logs_step ON public.payment_step_logs(step);

-- Bid pre-authorization indexes
CREATE INDEX IF NOT EXISTS idx_bid_preauth_auction ON public.bid_pre_authorizations(auction_id);
CREATE INDEX IF NOT EXISTS idx_bid_preauth_bidder ON public.bid_pre_authorizations(bidder_id);
CREATE INDEX IF NOT EXISTS idx_bid_preauth_status ON public.bid_pre_authorizations(status);
CREATE INDEX IF NOT EXISTS idx_bid_preauth_expires ON public.bid_pre_authorizations(expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_bid_preauth_stripe_intent ON public.bid_pre_authorizations(stripe_payment_intent_id);

-- Outbid cleanup indexes
CREATE INDEX IF NOT EXISTS idx_outbid_cleanup_auction ON public.outbid_cleanups(auction_id);
CREATE INDEX IF NOT EXISTS idx_outbid_cleanup_processed ON public.outbid_cleanups(processed_at) WHERE processed_at IS NULL;

-- Auction winner indexes
CREATE INDEX IF NOT EXISTS idx_auction_winners_auction ON public.auction_winners(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_winners_status ON public.auction_winners(payment_status);

-- ===================== ENABLE ROW LEVEL SECURITY FOR NEW TABLES =====================

-- Enable RLS on new tables
ALTER TABLE public.escrow_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_step_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_pre_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbid_cleanups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_winners ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for new tables

-- Escrow policies
DROP POLICY IF EXISTS "Users can view related escrow holds" ON public.escrow_holds;
CREATE POLICY "Users can view related escrow holds" ON public.escrow_holds
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM payments p WHERE p.id = payment_id AND p.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM auctions a WHERE a.id = auction_id AND a.seller_id = auth.uid())
    );

-- Delivery confirmation policies
DROP POLICY IF EXISTS "Users can manage delivery confirmations" ON public.delivery_confirmations;
CREATE POLICY "Users can manage delivery confirmations" ON public.delivery_confirmations
    FOR ALL USING (auth.uid() IN (buyer_id, seller_id));

-- Stripe account policies
DROP POLICY IF EXISTS "Users can manage their own Stripe account" ON public.stripe_accounts;
CREATE POLICY "Users can manage their own Stripe account" ON public.stripe_accounts
    FOR ALL USING (auth.uid() = user_id);

-- Payment step logs policies (read-only for users)
DROP POLICY IF EXISTS "Users can view payment logs for their payments" ON public.payment_step_logs;
CREATE POLICY "Users can view payment logs for their payments" ON public.payment_step_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM payments p WHERE p.id = payment_id AND p.user_id = auth.uid())
    );

-- Bid pre-authorization policies
DROP POLICY IF EXISTS "Users can view their own bid pre-auths" ON public.bid_pre_authorizations;
CREATE POLICY "Users can view their own bid pre-auths" ON public.bid_pre_authorizations
    FOR SELECT USING (auth.uid() = bidder_id);

DROP POLICY IF EXISTS "Service role can manage all bid pre-auths" ON public.bid_pre_authorizations;
CREATE POLICY "Service role can manage all bid pre-auths" ON public.bid_pre_authorizations
    FOR ALL USING (auth.role() = 'service_role');

-- Outbid cleanup policies (system only)
DROP POLICY IF EXISTS "Service role can manage outbid cleanups" ON public.outbid_cleanups;
CREATE POLICY "Service role can manage outbid cleanups" ON public.outbid_cleanups
    FOR ALL USING (auth.role() = 'service_role');

-- Auction winner policies
DROP POLICY IF EXISTS "Users can view auction results" ON public.auction_winners;
CREATE POLICY "Users can view auction results" ON public.auction_winners
    FOR SELECT USING (
        auth.uid() = winner_id 
        OR EXISTS (SELECT 1 FROM auctions WHERE auctions.id = auction_id AND auctions.seller_id = auth.uid())
    );

DROP POLICY IF EXISTS "Service role can manage auction winners" ON public.auction_winners;
CREATE POLICY "Service role can manage auction winners" ON public.auction_winners
    FOR ALL USING (auth.role() = 'service_role');

-- Update existing RLS policies

-- Update disputes policies to include payment_id
DROP POLICY IF EXISTS "Users can view their disputes" ON public.disputes;
CREATE POLICY "Users can view their disputes" ON public.disputes
    FOR SELECT USING (
        auth.uid() IN (opener_id, respondent_id)
        OR EXISTS (SELECT 1 FROM payments p WHERE p.id = payment_id AND p.user_id = auth.uid())
    );

-- ===================== CREATE TRIGGERS AND FUNCTIONS =====================

-- Function to automatically calculate fees
CREATE OR REPLACE FUNCTION calculate_payment_fees()
RETURNS TRIGGER AS $$
BEGIN
    -- Only calculate if amount has changed or new record
    IF NEW.amount IS NOT NULL THEN
        -- Calculate platform fee
        NEW.platform_fee_amount = COALESCE(NEW.platform_fee_amount, (NEW.amount * COALESCE(NEW.platform_fee_rate, 5.00) / 100));
        
        -- Estimate Stripe fee (2.9% + $0.30 for cards)
        NEW.stripe_fee_amount = COALESCE(NEW.stripe_fee_amount, (NEW.amount * 0.029) + 0.30);
        
        -- Calculate net amount to seller
        NEW.net_amount = NEW.amount - COALESCE(NEW.platform_fee_amount, 0) - COALESCE(NEW.stripe_fee_amount, 0);
        
        -- Ensure net amount is not negative
        IF NEW.net_amount < 0 THEN
            NEW.net_amount = 0;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for fee calculation
DROP TRIGGER IF EXISTS trigger_calculate_payment_fees ON public.payments;
CREATE TRIGGER trigger_calculate_payment_fees
    BEFORE INSERT OR UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION calculate_payment_fees();

-- Function to create escrow hold when payment is captured
CREATE OR REPLACE FUNCTION create_escrow_hold()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create escrow hold when payment step changes to 'captured'
    IF NEW.payment_step = 'captured' AND (OLD IS NULL OR OLD.payment_step != 'captured') THEN
        INSERT INTO public.escrow_holds (
            payment_id,
            auction_id,
            amount,
            hold_until
        ) VALUES (
            NEW.id,
            NEW.auction_id,
            COALESCE(NEW.net_amount, NEW.amount),
            NOW() + INTERVAL '5 days'
        );
        
        -- Update payment step to in_escrow
        NEW.payment_step = 'in_escrow';
        NEW.escrowed_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for escrow hold creation
DROP TRIGGER IF EXISTS trigger_create_escrow_hold ON public.payments;
CREATE TRIGGER trigger_create_escrow_hold
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION create_escrow_hold();

-- Function to update payout amounts based on payment
CREATE OR REPLACE FUNCTION update_payout_amounts()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-populate payout amounts from related payment if not provided
    IF NEW.payment_id IS NOT NULL AND (NEW.gross_amount IS NULL OR NEW.platform_fee IS NULL OR NEW.net_amount IS NULL) THEN
        UPDATE public.payouts 
        SET 
            gross_amount = COALESCE(NEW.gross_amount, p.amount),
            platform_fee = COALESCE(NEW.platform_fee, p.platform_fee_amount),
            stripe_fee = COALESCE(NEW.stripe_fee, p.stripe_fee_amount),
            net_amount = COALESCE(NEW.net_amount, p.net_amount)
        FROM public.payments p
        WHERE p.id = NEW.payment_id AND public.payouts.id = NEW.id;
        
        -- Reload the updated values
        SELECT gross_amount, platform_fee, stripe_fee, net_amount
        INTO NEW.gross_amount, NEW.platform_fee, NEW.stripe_fee, NEW.net_amount
        FROM public.payouts WHERE id = NEW.id;
    END IF;
    
    -- If amount field is still used (legacy), sync it with net_amount
    IF NEW.net_amount IS NOT NULL THEN
        NEW.amount = NEW.net_amount;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payout amount updates
DROP TRIGGER IF EXISTS trigger_update_payout_amounts ON public.payouts;
CREATE TRIGGER trigger_update_payout_amounts
    BEFORE INSERT OR UPDATE ON public.payouts
    FOR EACH ROW
    EXECUTE FUNCTION update_payout_amounts();

-- Function to handle outbid cleanup when new bids are placed
CREATE OR REPLACE FUNCTION handle_outbid_cleanup()
RETURNS TRIGGER AS $$
DECLARE
    previous_highest_bid RECORD;
    affected_preauth RECORD;
BEGIN
    -- Only process for new bid inserts
    IF TG_OP = 'INSERT' THEN
        -- Find the previous highest bid for this auction (excluding the new bid)
        SELECT b.bidder_id, b.amount INTO previous_highest_bid
        FROM bids b
        WHERE b.auction_id = NEW.auction_id 
        AND b.id != NEW.id
        AND b.bidder_id != NEW.bidder_id -- Don't outbid yourself
        ORDER BY b.amount DESC, b.created_at ASC
        LIMIT 1;

        -- If there was a previous highest bidder, they've been outbid
        IF previous_highest_bid IS NOT NULL THEN
            
            -- Find their active pre-authorization
            SELECT * INTO affected_preauth
            FROM bid_pre_authorizations
            WHERE auction_id = NEW.auction_id
            AND bidder_id = previous_highest_bid.bidder_id
            AND status = 'active';

            -- If they have an active pre-auth, schedule it for cleanup
            IF affected_preauth IS NOT NULL THEN
                INSERT INTO outbid_cleanups (
                    auction_id,
                    outbid_bidder_id,
                    new_highest_bidder_id,
                    canceled_preauth_id,
                    previous_bid_amount,
                    new_bid_amount
                ) VALUES (
                    NEW.auction_id,
                    previous_highest_bid.bidder_id,
                    NEW.bidder_id,
                    affected_preauth.id,
                    previous_highest_bid.amount,
                    NEW.amount
                );
                
                -- Mark the pre-auth as canceled
                UPDATE bid_pre_authorizations
                SET 
                    status = 'canceled',
                    canceled_at = NOW(),
                    updated_at = NOW()
                WHERE id = affected_preauth.id;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for outbid cleanup
DROP TRIGGER IF EXISTS trigger_handle_outbid_cleanup ON public.bids;
CREATE TRIGGER trigger_handle_outbid_cleanup
    AFTER INSERT ON public.bids
    FOR EACH ROW
    EXECUTE FUNCTION handle_outbid_cleanup();

-- Function to determine auction winner when auction ends
CREATE OR REPLACE FUNCTION determine_auction_winner(auction_uuid UUID)
RETURNS UUID AS $$
DECLARE
    winner_record RECORD;
    winning_bid_record RECORD;
    preauth_record RECORD;
    platform_fee_amount DECIMAL(10,2);
    seller_amount DECIMAL(10,2);
BEGIN
    -- Find the highest bid for this auction
    SELECT b.*, u.id as bidder_id
    INTO winning_bid_record
    FROM bids b
    JOIN users u ON u.id = b.bidder_id
    WHERE b.auction_id = auction_uuid
    ORDER BY b.amount DESC, b.created_at ASC
    LIMIT 1;

    -- If no bids found, return null
    IF winning_bid_record IS NULL THEN
        RETURN NULL;
    END IF;

    -- Calculate fees
    platform_fee_amount := winning_bid_record.amount * 0.05; -- 5% platform fee
    seller_amount := winning_bid_record.amount - platform_fee_amount;

    -- Find the winner's active pre-authorization
    SELECT * INTO preauth_record
    FROM bid_pre_authorizations
    WHERE auction_id = auction_uuid
    AND bidder_id = winning_bid_record.bidder_id
    AND status = 'active';

    -- Create auction winner record
    INSERT INTO auction_winners (
        auction_id,
        winner_id,
        winning_bid_id,
        preauth_id,
        winning_amount,
        platform_fee,
        seller_amount,
        payment_status
    ) VALUES (
        auction_uuid,
        winning_bid_record.bidder_id,
        winning_bid_record.id,
        preauth_record.id,
        winning_bid_record.amount,
        platform_fee_amount,
        seller_amount,
        'pending'
    ) RETURNING id INTO winner_record;

    -- Update auction status
    UPDATE auctions 
    SET status = 'completed' 
    WHERE id = auction_uuid;

    -- Mark the winning pre-auth as used
    IF preauth_record IS NOT NULL THEN
        UPDATE bid_pre_authorizations
        SET 
            status = 'used',
            used_at = NOW(),
            updated_at = NOW()
        WHERE id = preauth_record.id;
    END IF;

    RETURN winner_record.id;
END;
$$ LANGUAGE plpgsql;

-- ===================== MIGRATE EXISTING DATA =====================

-- Update existing payments to have proper stripe_payment_intent_id
UPDATE public.payments 
SET stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, intent_id)
WHERE stripe_payment_intent_id IS NULL AND intent_id IS NOT NULL;

-- Update any missing payment steps for existing records
UPDATE public.payments
SET payment_step = 
    CASE 
        WHEN status = 'succeeded' THEN 'completed'
        WHEN status = 'requires_capture' THEN 'captured'
        WHEN status IN ('requires_confirmation', 'requires_action') THEN 'pre_authorized'
        ELSE 'pre_authorized'
    END
WHERE payment_step IS NULL;

-- Set default hold_expires_at for existing payouts
UPDATE public.payouts 
SET hold_expires_at = COALESCE(hold_expires_at, created_at + INTERVAL '5 days')
WHERE hold_expires_at IS NULL;

-- ===================== GRANT NECESSARY PERMISSIONS =====================

-- Grant permissions for service role (for API functions)
GRANT ALL ON public.escrow_holds TO service_role;
GRANT ALL ON public.delivery_confirmations TO service_role;
GRANT ALL ON public.stripe_accounts TO service_role;
GRANT ALL ON public.payment_step_logs TO service_role;
GRANT ALL ON public.bid_pre_authorizations TO service_role;
GRANT ALL ON public.outbid_cleanups TO service_role;
GRANT ALL ON public.auction_winners TO service_role;

-- Grant appropriate permissions for authenticated users
GRANT SELECT ON public.escrow_holds TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.delivery_confirmations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.stripe_accounts TO authenticated;
GRANT SELECT ON public.payment_step_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.bid_pre_authorizations TO authenticated;
GRANT SELECT ON public.outbid_cleanups TO authenticated;
GRANT SELECT ON public.auction_winners TO authenticated;

-- ===================== SUCCESS MESSAGE =====================
DO $$
BEGIN
    RAISE NOTICE '✅ Stripe Payment Migration Completed Successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '• Added Stripe columns to existing tables (users, payments, payouts, disputes)';
    RAISE NOTICE '• Created new tables: escrow_holds, delivery_confirmations, stripe_accounts, payment_step_logs, bid_pre_authorizations, outbid_cleanups, auction_winners';
    RAISE NOTICE '• Added performance indexes for payment operations';
    RAISE NOTICE '• Set up Row Level Security policies';
    RAISE NOTICE '• Created triggers for automatic fee calculation and escrow management';
    RAISE NOTICE '• Migrated existing data to new structure';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Set up your Stripe environment variables';
    RAISE NOTICE '2. Configure Stripe webhooks';
    RAISE NOTICE '3. Test the payment flow in development';
    RAISE NOTICE '4. Set up the auto-release cron job';
    RAISE NOTICE '';
    RAISE NOTICE 'All existing data has been preserved!';
END
$$;
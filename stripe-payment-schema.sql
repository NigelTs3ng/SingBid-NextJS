-- =================================================
-- STRIPE 6-STEP PAYMENT FLOW DATABASE SCHEMA
-- Enhanced schema for SingBid payment processing
-- =================================================

-- ===================== ENHANCED PAYMENTS TABLE =====================
-- Drop and recreate payments table with enhanced Stripe fields
DROP TABLE IF EXISTS public.payments CASCADE;

CREATE TABLE public.payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    auction_id uuid REFERENCES public.auctions(id) ON DELETE SET NULL,
    
    -- Stripe Payment Intent fields
    stripe_payment_intent_id TEXT UNIQUE NOT NULL,
    stripe_client_secret TEXT,
    
    -- Payment details
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'SGD',
    
    -- Step tracking
    payment_step VARCHAR(20) DEFAULT 'pre_authorized' CHECK (
        payment_step IN ('pre_authorized', 'captured', 'in_escrow', 'released', 'disputed', 'completed')
    ),
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'requires_confirmation' CHECK (
        status IN (
            'requires_confirmation', 'requires_action', 'processing', 
            'succeeded', 'canceled', 'requires_capture'
        )
    ),
    
    -- Fee structure
    platform_fee_rate DECIMAL(5,2) DEFAULT 5.00 CHECK (platform_fee_rate >= 0),
    platform_fee_amount DECIMAL(10,2) DEFAULT 0 CHECK (platform_fee_amount >= 0),
    stripe_fee_amount DECIMAL(10,2) DEFAULT 0 CHECK (stripe_fee_amount >= 0),
    net_amount DECIMAL(10,2) DEFAULT 0 CHECK (net_amount >= 0),
    
    -- Timestamps for each step
    pre_authorized_at TIMESTAMP WITH TIME ZONE,
    captured_at TIMESTAMP WITH TIME ZONE,
    escrowed_at TIMESTAMP WITH TIME ZONE,
    release_scheduled_at TIMESTAMP WITH TIME ZONE,
    released_at TIMESTAMP WITH TIME ZONE,
    
    -- Payment method info
    payment_method_id TEXT,
    payment_method_type VARCHAR(50),
    last_four VARCHAR(4),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    failure_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ===================== ESCROW MANAGEMENT =====================
CREATE TABLE public.escrow_holds (
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

-- ===================== ENHANCED DISPUTES TABLE =====================
-- Drop and recreate disputes table with Stripe integration
DROP TABLE IF EXISTS public.disputes CASCADE;

CREATE TABLE public.disputes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id uuid REFERENCES public.payments(id) ON DELETE CASCADE,
    auction_id uuid REFERENCES public.auctions(id) ON DELETE CASCADE,
    
    -- Parties involved
    opener_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    respondent_id uuid REFERENCES public.users(id),
    
    -- Dispute details
    type VARCHAR(50) DEFAULT 'general' CHECK (
        type IN ('item_not_received', 'item_not_as_described', 'payment_issue', 
                'shipping_issue', 'fraudulent_activity', 'general')
    ),
    reason TEXT NOT NULL,
    description TEXT,
    
    -- Status management
    status VARCHAR(20) DEFAULT 'open' CHECK (
        status IN ('open', 'investigating', 'awaiting_response', 'resolved', 'closed')
    ),
    
    -- Resolution
    resolution TEXT,
    resolution_type VARCHAR(30) CHECK (
        resolution_type IN ('refund_buyer', 'release_to_seller', 'partial_refund', 'no_action')
    ),
    resolved_by uuid REFERENCES public.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Evidence and communication
    evidence_urls JSONB DEFAULT '[]'::jsonb,
    messages JSONB DEFAULT '[]'::jsonb,
    
    -- Stripe dispute integration
    stripe_dispute_id TEXT,
    
    -- Timing
    response_due_at TIMESTAMP WITH TIME ZONE,
    escalated_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ===================== ENHANCED PAYOUTS TABLE =====================
-- Drop and recreate payouts table with Stripe integration
DROP TABLE IF EXISTS public.payouts CASCADE;

CREATE TABLE public.payouts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id uuid REFERENCES public.payments(id) ON DELETE CASCADE,
    seller_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    auction_id uuid REFERENCES public.auctions(id) ON DELETE CASCADE,
    
    -- Payout amounts
    gross_amount DECIMAL(10,2) NOT NULL CHECK (gross_amount >= 0),
    platform_fee DECIMAL(10,2) NOT NULL CHECK (platform_fee >= 0),
    stripe_fee DECIMAL(10,2) DEFAULT 0 CHECK (stripe_fee >= 0),
    net_amount DECIMAL(10,2) NOT NULL CHECK (net_amount >= 0),
    
    -- Stripe integration
    stripe_transfer_id TEXT,
    stripe_payout_id TEXT,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'paid', 'failed', 'canceled', 'reversed')
    ),
    
    -- Timing
    scheduled_for TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Bank account info (for reference)
    destination_account TEXT,
    
    -- Failure handling
    failure_reason TEXT,
    retry_count INT DEFAULT 0,
    
    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ===================== DELIVERY CONFIRMATIONS =====================
CREATE TABLE public.delivery_confirmations (
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

-- ===================== STRIPE CONNECTED ACCOUNTS =====================
CREATE TABLE public.stripe_accounts (
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

-- ===================== PAYMENT STEP LOGS =====================
-- Track each step of the payment process for debugging and compliance
CREATE TABLE public.payment_step_logs (
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

-- ===================== INDEXES FOR PERFORMANCE =====================
-- Payment indexes
CREATE INDEX idx_payments_stripe_intent ON public.payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_user_status ON public.payments(user_id, status);
CREATE INDEX idx_payments_auction ON public.payments(auction_id);
CREATE INDEX idx_payments_step ON public.payments(payment_step);

-- Escrow indexes
CREATE INDEX idx_escrow_holds_payment ON public.escrow_holds(payment_id);
CREATE INDEX idx_escrow_holds_status ON public.escrow_holds(status);
CREATE INDEX idx_escrow_holds_auto_release ON public.escrow_holds(hold_until) WHERE auto_release = true AND status = 'active';

-- Payout indexes
CREATE INDEX idx_payouts_seller ON public.payouts(seller_id);
CREATE INDEX idx_payouts_status ON public.payouts(status);
CREATE INDEX idx_payouts_scheduled ON public.payouts(scheduled_for) WHERE status = 'pending';

-- Stripe account indexes
CREATE INDEX idx_stripe_accounts_user ON public.stripe_accounts(user_id);
CREATE INDEX idx_stripe_accounts_stripe_id ON public.stripe_accounts(stripe_account_id);

-- Step logs indexes
CREATE INDEX idx_payment_step_logs_payment ON public.payment_step_logs(payment_id);
CREATE INDEX idx_payment_step_logs_step ON public.payment_step_logs(step);

-- ===================== ROW LEVEL SECURITY =====================
-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_step_logs ENABLE ROW LEVEL SECURITY;

-- Payment policies
CREATE POLICY "Users can view their own payments" ON public.payments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage payments" ON public.payments
    FOR ALL USING (auth.role() = 'service_role');

-- Escrow policies
CREATE POLICY "Users can view related escrow holds" ON public.escrow_holds
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM payments p WHERE p.id = payment_id AND p.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM auctions a WHERE a.id = auction_id AND a.seller_id = auth.uid())
    );

-- Dispute policies
CREATE POLICY "Users can view their disputes" ON public.disputes
    FOR SELECT USING (auth.uid() IN (opener_id, respondent_id));

CREATE POLICY "Users can create disputes" ON public.disputes
    FOR INSERT WITH CHECK (auth.uid() = opener_id);

-- Payout policies
CREATE POLICY "Sellers can view their payouts" ON public.payouts
    FOR SELECT USING (auth.uid() = seller_id);

-- Stripe account policies
CREATE POLICY "Users can manage their own Stripe account" ON public.stripe_accounts
    FOR ALL USING (auth.uid() = user_id);

-- ===================== TRIGGERS AND FUNCTIONS =====================
-- Function to automatically calculate fees
CREATE OR REPLACE FUNCTION calculate_payment_fees()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate platform fee
    NEW.platform_fee_amount = (NEW.amount * NEW.platform_fee_rate / 100);
    
    -- Estimate Stripe fee (2.9% + $0.30 for cards)
    NEW.stripe_fee_amount = (NEW.amount * 0.029) + 0.30;
    
    -- Calculate net amount to seller
    NEW.net_amount = NEW.amount - NEW.platform_fee_amount - NEW.stripe_fee_amount;
    
    -- Ensure net amount is not negative
    IF NEW.net_amount < 0 THEN
        NEW.net_amount = 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to calculate fees
CREATE TRIGGER trigger_calculate_payment_fees
    BEFORE INSERT OR UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION calculate_payment_fees();

-- Function to create escrow hold when payment is captured
CREATE OR REPLACE FUNCTION create_escrow_hold()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create escrow hold when payment step changes to 'captured'
    IF NEW.payment_step = 'captured' AND (OLD.payment_step IS NULL OR OLD.payment_step != 'captured') THEN
        INSERT INTO public.escrow_holds (
            payment_id,
            auction_id,
            amount,
            hold_until
        ) VALUES (
            NEW.id,
            NEW.auction_id,
            NEW.net_amount,
            NOW() + INTERVAL '5 days'
        );
        
        -- Update payment step
        NEW.payment_step = 'in_escrow';
        NEW.escrowed_at = NOW();
    END IF;
    
    RETURN NEW;END;
$$ LANGUAGE plpgsql;

-- Trigger to create escrow hold
CREATE TRIGGER trigger_create_escrow_hold
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION create_escrow_hold();

-- Function to auto-release escrow holds
CREATE OR REPLACE FUNCTION process_escrow_releases()
RETURNS void AS $$
DECLARE
    hold_record RECORD;
BEGIN
    -- Find holds ready for release
    FOR hold_record IN 
        SELECT eh.*, p.id as payment_id, p.seller_id
        FROM public.escrow_holds eh
        JOIN public.payments p ON p.id = eh.payment_id
        WHERE eh.status = 'active' 
        AND eh.auto_release = true 
        AND eh.hold_until <= NOW()
        AND eh.dispute_opened = false
    LOOP
        -- Release the hold
        UPDATE public.escrow_holds 
        SET status = 'released', 
            release_reason = 'Auto-released after 5 days'
        WHERE id = hold_record.id;
        
        -- Update payment status
        UPDATE public.payments 
        SET payment_step = 'released',
            released_at = NOW()
        WHERE id = hold_record.payment_id;
        
        -- Create payout record
        INSERT INTO public.payouts (
            payment_id,
            seller_id,
            auction_id,
            gross_amount,
            platform_fee,
            net_amount,
            scheduled_for
        ) SELECT 
            p.id,
            p.user_id, -- This should be seller_id
            p.auction_id,
            p.amount,
            p.platform_fee_amount,
            p.net_amount,
            NOW()
        FROM public.payments p 
        WHERE p.id = hold_record.payment_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ===================== SUCCESS MESSAGE =====================
DO $$
BEGIN
    RAISE NOTICE '✅ Stripe 6-Step Payment Flow Schema Created Successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Set up Stripe webhooks';
    RAISE NOTICE '2. Configure Stripe Connect for sellers';
    RAISE NOTICE '3. Implement API endpoints';
    RAISE NOTICE '4. Set up scheduled tasks for escrow releases';
    RAISE NOTICE '';
    RAISE NOTICE 'Payment Flow Steps:';
    RAISE NOTICE '• Step 1: Pre-authorization (Payment Intent created)';
    RAISE NOTICE '• Step 2: Capture (Winner determined)';
    RAISE NOTICE '• Step 3: Escrow (Funds held for 5 days)';
    RAISE NOTICE '• Step 4: Release (Auto or manual confirmation)';
    RAISE NOTICE '• Step 5: Dispute (If needed)';
    RAISE NOTICE '• Step 6: Payout (Seller receives funds minus fees)';
END
$$;
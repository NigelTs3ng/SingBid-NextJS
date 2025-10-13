-- =================================================
-- SingBid Stripe Connect & Enhanced Signup Migration
-- Run this script in your Supabase SQL Editor
-- =================================================

-- ===================== ENHANCED USER INFORMATION =====================
-- Add new columns to users table for Stripe Connect and enhanced signup
ALTER TABLE public.users 
  -- Stripe Connect columns
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_requirements_pending TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS stripe_requirements_disabled_reason TEXT,
  ADD COLUMN IF NOT EXISTS stripe_verification_status VARCHAR(20) DEFAULT 'unverified' CHECK (stripe_verification_status IN ('unverified', 'pending', 'verified', 'restricted')),
  
  -- Enhanced personal information
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
  
  -- Business information
  ADD COLUMN IF NOT EXISTS business_type VARCHAR(20) DEFAULT 'individual' CHECK (business_type IN ('individual', 'company')),
  ADD COLUMN IF NOT EXISTS business_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50),
  
  -- Address information
  ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255),
  ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255),
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS country VARCHAR(2) DEFAULT 'SG',
  
  -- Legal and compliance
  ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS stripe_tos_accepted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_tos_accepted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE;

-- ===================== USER PROFILES ENHANCEMENT =====================
-- Update user_profiles to reference the enhanced user data
-- Remove duplicate columns that are now in users table
ALTER TABLE public.user_profiles 
  DROP COLUMN IF EXISTS first_name,
  DROP COLUMN IF EXISTS last_name;

-- ===================== STRIPE CONNECT ACCOUNTS TABLE =====================
-- Create a detailed table for Stripe Connect account information
CREATE TABLE IF NOT EXISTS public.stripe_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    stripe_account_id TEXT UNIQUE NOT NULL,
    
    -- Account status
    charges_enabled BOOLEAN DEFAULT FALSE,
    payouts_enabled BOOLEAN DEFAULT FALSE,
    details_submitted BOOLEAN DEFAULT FALSE,
    
    -- Verification status
    verification_status VARCHAR(20) DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'restricted')),
    verification_disabled_reason TEXT,
    verification_due_by TIMESTAMP WITH TIME ZONE,
    
    -- Requirements
    requirements_currently_due TEXT[] DEFAULT '{}',
    requirements_eventually_due TEXT[] DEFAULT '{}',
    requirements_past_due TEXT[] DEFAULT '{}',
    requirements_pending_verification TEXT[] DEFAULT '{}',
    requirements_disabled_reason TEXT,
    
    -- Onboarding
    onboarding_url TEXT,
    onboarding_url_expires_at TIMESTAMP WITH TIME ZONE,
    onboarding_type VARCHAR(20) DEFAULT 'standard',
    
    -- Capabilities
    card_payments_enabled BOOLEAN DEFAULT FALSE,
    transfers_enabled BOOLEAN DEFAULT FALSE,
    
    -- Account details
    account_type VARCHAR(20),
    business_profile JSONB DEFAULT '{}'::jsonb,
    default_currency VARCHAR(3) DEFAULT 'SGD',
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ===================== ENHANCED PAYMENTS TABLE =====================
-- Add Stripe Connect specific columns to payments table
ALTER TABLE public.payments 
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT,
  ADD COLUMN IF NOT EXISTS application_fee_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transfer_group TEXT,
  ADD COLUMN IF NOT EXISTS on_behalf_of TEXT,
  ADD COLUMN IF NOT EXISTS destination_payment_method TEXT;

-- ===================== SELLER VERIFICATION LOG =====================
-- Create table to track seller verification attempts and status changes
CREATE TABLE IF NOT EXISTS public.seller_verification_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    stripe_account_id TEXT,
    
    -- Event details
    event_type VARCHAR(50) NOT NULL, -- 'account_created', 'onboarding_started', 'verification_completed', etc.
    status_before VARCHAR(20),
    status_after VARCHAR(20),
    
    -- Requirements tracking
    requirements_added TEXT[] DEFAULT '{}',
    requirements_removed TEXT[] DEFAULT '{}',
    
    -- Additional data
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ===================== AUCTION VERIFICATION REQUIREMENTS =====================
-- Add seller verification requirements to auctions table
ALTER TABLE public.auctions 
  ADD COLUMN IF NOT EXISTS requires_verified_seller BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS seller_verification_checked_at TIMESTAMP WITH TIME ZONE;

-- ===================== INDEXES FOR PERFORMANCE =====================
-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_users_stripe_account ON public.users(stripe_account_id) WHERE stripe_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_verification_status ON public.users(stripe_verification_status);
CREATE INDEX IF NOT EXISTS idx_users_business_type ON public.users(business_type);
CREATE INDEX IF NOT EXISTS idx_users_country ON public.users(country);

CREATE INDEX IF NOT EXISTS idx_stripe_accounts_user ON public.stripe_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_stripe_id ON public.stripe_accounts(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_status ON public.stripe_accounts(verification_status);

CREATE INDEX IF NOT EXISTS idx_payments_stripe_account ON public.payments(stripe_account_id) WHERE stripe_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_transfer ON public.payments(stripe_transfer_id) WHERE stripe_transfer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_verification_log_user_date ON public.seller_verification_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_log_event ON public.seller_verification_log(event_type);

-- ===================== ROW LEVEL SECURITY =====================
-- Enable RLS on new tables
ALTER TABLE public.stripe_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_verification_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stripe_accounts
CREATE POLICY "Users can view their own Stripe account info" ON public.stripe_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own Stripe account info" ON public.stripe_accounts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert Stripe account info" ON public.stripe_accounts
    FOR INSERT WITH CHECK (true); -- Allows API to create accounts

-- RLS Policies for seller_verification_log
CREATE POLICY "Users can view their own verification log" ON public.seller_verification_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert verification log entries" ON public.seller_verification_log
    FOR INSERT WITH CHECK (true); -- Allows API to log events

-- ===================== FUNCTIONS & TRIGGERS =====================
-- Function to sync Stripe account data with users table
CREATE OR REPLACE FUNCTION sync_stripe_account_to_users()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the users table with Stripe account information
    UPDATE public.users 
    SET 
        stripe_account_id = NEW.stripe_account_id,
        stripe_onboarding_complete = NEW.details_submitted,
        stripe_charges_enabled = NEW.charges_enabled,
        stripe_payouts_enabled = NEW.payouts_enabled,
        stripe_details_submitted = NEW.details_submitted,
        stripe_verification_status = NEW.verification_status,
        updated_at = now()
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync Stripe account data
CREATE TRIGGER trigger_sync_stripe_account_to_users
    AFTER INSERT OR UPDATE ON public.stripe_accounts
    FOR EACH ROW
    EXECUTE FUNCTION sync_stripe_account_to_users();

-- Function to log seller verification events
CREATE OR REPLACE FUNCTION log_seller_verification_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Log verification status changes
    IF OLD.stripe_verification_status IS DISTINCT FROM NEW.stripe_verification_status THEN
        INSERT INTO public.seller_verification_log (
            user_id,
            stripe_account_id,
            event_type,
            status_before,
            status_after,
            details
        ) VALUES (
            NEW.id,
            NEW.stripe_account_id,
            'verification_status_changed',
            OLD.stripe_verification_status,
            NEW.stripe_verification_status,
            jsonb_build_object(
                'charges_enabled', NEW.stripe_charges_enabled,
                'payouts_enabled', NEW.stripe_payouts_enabled,
                'details_submitted', NEW.stripe_details_submitted
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to log verification events
CREATE TRIGGER trigger_log_seller_verification
    AFTER UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION log_seller_verification_event();

-- Function to update updated_at timestamp for new tables
CREATE TRIGGER update_stripe_accounts_updated_at 
    BEFORE UPDATE ON public.stripe_accounts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ===================== HELPER FUNCTIONS =====================
-- Function to check if user can create auctions (seller verification check)
CREATE OR REPLACE FUNCTION can_user_create_auctions(user_uuid uuid)
RETURNS BOOLEAN AS $$
DECLARE
    user_verification_status TEXT;
    charges_enabled BOOLEAN;
BEGIN
    SELECT 
        stripe_verification_status,
        stripe_charges_enabled
    INTO 
        user_verification_status,
        charges_enabled
    FROM public.users 
    WHERE id = user_uuid;
    
    -- User can create auctions if they are verified and charges are enabled
    RETURN (user_verification_status = 'verified' AND charges_enabled = true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's Stripe onboarding status
CREATE OR REPLACE FUNCTION get_user_onboarding_status(user_uuid uuid)
RETURNS TABLE (
    has_stripe_account BOOLEAN,
    verification_status TEXT,
    charges_enabled BOOLEAN,
    payouts_enabled BOOLEAN,
    details_submitted BOOLEAN,
    requirements_pending TEXT[],
    can_create_auctions BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (u.stripe_account_id IS NOT NULL) as has_stripe_account,
        COALESCE(u.stripe_verification_status, 'unverified') as verification_status,
        COALESCE(u.stripe_charges_enabled, false) as charges_enabled,
        COALESCE(u.stripe_payouts_enabled, false) as payouts_enabled,
        COALESCE(u.stripe_details_submitted, false) as details_submitted,
        COALESCE(u.stripe_requirements_pending, '{}') as requirements_pending,
        can_user_create_auctions(user_uuid) as can_create_auctions
    FROM public.users u
    WHERE u.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================== UPDATE EXISTING DATA =====================
-- Migrate existing user data if needed
-- Update existing users to have default verification status
UPDATE public.users 
SET 
    stripe_verification_status = 'unverified',
    business_type = 'individual',
    country = 'SG',
    terms_accepted = true,
    terms_accepted_at = created_at
WHERE stripe_verification_status IS NULL;

-- ===================== SAMPLE DATA FOR TESTING =====================
-- Insert some sample business types for reference
-- (This is for documentation purposes - the constraint handles validation)

-- Create a view for easy seller status checking
CREATE OR REPLACE VIEW seller_status_view AS
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.business_type,
    u.stripe_account_id,
    u.stripe_verification_status,
    u.stripe_charges_enabled,
    u.stripe_payouts_enabled,
    u.stripe_details_submitted,
    sa.onboarding_url,
    sa.onboarding_url_expires_at,
    can_user_create_auctions(u.id) as can_create_auctions,
    CASE 
        WHEN u.stripe_account_id IS NULL THEN 'needs_account_creation'
        WHEN NOT u.stripe_details_submitted THEN 'needs_onboarding'
        WHEN u.stripe_verification_status = 'pending' THEN 'verification_pending'
        WHEN u.stripe_verification_status = 'verified' AND u.stripe_charges_enabled THEN 'verified'
        ELSE 'restricted'
    END as onboarding_step
FROM public.users u
LEFT JOIN public.stripe_accounts sa ON u.stripe_account_id = sa.stripe_account_id;

-- Grant access to the view
GRANT SELECT ON seller_status_view TO authenticated;

-- ===================== FINAL VALIDATION =====================
-- Add constraint to ensure terms are accepted before Stripe onboarding
ALTER TABLE public.users 
ADD CONSTRAINT terms_required_for_stripe 
CHECK (
    stripe_account_id IS NULL OR 
    (terms_accepted = true AND stripe_tos_accepted = true)
);

-- ============================================================
-- END OF STRIPE CONNECT & ENHANCED SIGNUP MIGRATION
-- ============================================================

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Stripe Connect & Enhanced Signup Migration Complete!';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'New Features Added:';
    RAISE NOTICE '• Enhanced user signup with Stripe-ready information';
    RAISE NOTICE '• Stripe Connect account management';
    RAISE NOTICE '• Seller verification tracking';
    RAISE NOTICE '• Auction creation restrictions for unverified sellers';
    RAISE NOTICE '• Comprehensive logging and status tracking';
    RAISE NOTICE '';
    RAISE NOTICE 'New Tables Created:';
    RAISE NOTICE '• stripe_accounts - Detailed Stripe Connect account info';
    RAISE NOTICE '• seller_verification_log - Verification event tracking';
    RAISE NOTICE '';
    RAISE NOTICE 'New Views Created:';
    RAISE NOTICE '• seller_status_view - Easy seller status checking';
    RAISE NOTICE '';
    RAISE NOTICE 'New Functions Created:';
    RAISE NOTICE '• can_user_create_auctions() - Check if user can create auctions';
    RAISE NOTICE '• get_user_onboarding_status() - Get complete onboarding status';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Update your Stripe webhook endpoints to handle account updates';
    RAISE NOTICE '2. Test the new signup flow with sample users';
    RAISE NOTICE '3. Verify that existing users can still access their data';
    RAISE NOTICE '4. Configure your Stripe Connect settings in the dashboard';
END
$$;
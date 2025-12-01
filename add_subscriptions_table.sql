-- Add subscriptions table for premium features
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    plan_type VARCHAR(20) DEFAULT 'standard' CHECK (plan_type IN ('standard', 'premium')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'pending', 'expired')),
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    stripe_subscription_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own subscription
CREATE POLICY "Users can view own subscription" ON public.user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription" ON public.user_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_subscriptions_updated_at 
    BEFORE UPDATE ON public.user_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add user_role column to users table if not exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS user_role VARCHAR(20) DEFAULT 'bidder' CHECK (user_role IN ('bidder', 'seller'));

-- Add stripe_account_id and stripe_onboarding_complete to users table if not exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT FALSE;

COMMENT ON TABLE public.user_subscriptions IS 'User subscription plans and status tracking';

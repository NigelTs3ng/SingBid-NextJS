-- BidWin Phase 2: Payouts schema
-- Tables: payouts, payout_items
-- Run this in Supabase SQL editor or include in migration process

-- Enable extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Payouts table
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','processing','paid','failed','cancelled')),
  amount_total NUMERIC(12,2) NOT NULL CHECK (amount_total >= 0),
  fee_total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (fee_total >= 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'usd',
  destination_account_id VARCHAR(255), -- Stripe connected account id
  stripe_payout_id VARCHAR(255),
  notes TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payout items link individual payments to a payout
CREATE TABLE IF NOT EXISTS public.payout_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payout_id UUID NOT NULL REFERENCES public.payouts(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (payout_id, payment_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payouts_seller_id ON public.payouts(seller_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payouts(status);
CREATE INDEX IF NOT EXISTS idx_payout_items_payment_id ON public.payout_items(payment_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payouts_updated_at
BEFORE UPDATE ON public.payouts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_items ENABLE ROW LEVEL SECURITY;

-- Policies
-- Sellers can see their own payouts
DROP POLICY IF EXISTS "Sellers can view own payouts" ON public.payouts;
CREATE POLICY "Sellers can view own payouts" ON public.payouts
  FOR SELECT USING (auth.uid() = seller_id);

-- Sellers can insert payout requests for themselves
DROP POLICY IF EXISTS "Sellers can request payouts" ON public.payouts;
CREATE POLICY "Sellers can request payouts" ON public.payouts
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

-- Sellers can see payout_items that belong to their payouts
DROP POLICY IF EXISTS "Sellers can view own payout items" ON public.payout_items;
CREATE POLICY "Sellers can view own payout items" ON public.payout_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.payouts p
      WHERE p.id = payout_items.payout_id AND p.seller_id = auth.uid()
    )
  );

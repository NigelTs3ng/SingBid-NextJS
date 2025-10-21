-- Add payment authorization tracking to bids table
ALTER TABLE bids 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS authorization_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS authorized_amount DECIMAL(10,2);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bids_payment_intent ON bids(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_bids_authorization_status ON bids(authorization_status);

-- Update existing bids to have default authorization status
UPDATE bids 
SET authorization_status = 'not_required'
WHERE authorization_status IS NULL;
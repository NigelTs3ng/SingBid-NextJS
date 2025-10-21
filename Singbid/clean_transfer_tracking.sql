-- Add Stripe transfer tracking to payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT,
ADD COLUMN IF NOT EXISTS transfer_status TEXT DEFAULT 'pending';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_transfer_id ON payments(stripe_transfer_id);
CREATE INDEX IF NOT EXISTS idx_payments_transfer_status ON payments(transfer_status);

-- Update existing payments to have default transfer status
UPDATE payments 
SET transfer_status = 'completed'
WHERE transfer_status IS NULL AND status = 'completed';
-- Add duration fields to auctions table
ALTER TABLE auctions 
ADD COLUMN duration_value INTEGER,
ADD COLUMN duration_unit VARCHAR(10) CHECK (duration_unit IN ('minutes', 'hours', 'days')),
ADD COLUMN start_time TIMESTAMP WITH TIME ZONE;

-- Update existing auctions to have duration data
-- Assuming existing auctions have a 7-day duration as default
UPDATE auctions 
SET duration_value = 7,
    duration_unit = 'days',
    start_time = COALESCE(created_at, NOW())
WHERE duration_value IS NULL;

-- Make the new fields NOT NULL after updating existing data
ALTER TABLE auctions 
ALTER COLUMN duration_value SET NOT NULL,
ALTER COLUMN duration_unit SET NOT NULL,
ALTER COLUMN start_time SET NOT NULL;

-- Add index for better query performance
CREATE INDEX idx_auctions_timing ON auctions(start_time, end_time, duration_unit);
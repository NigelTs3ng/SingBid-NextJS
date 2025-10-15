-- Fix image_urls column type from TEXT to JSONB
-- This ensures Supabase returns image_urls as native JSON array instead of string

-- First, clean up any malformed JSON data
UPDATE public.auctions 
SET image_urls = '[]'::text 
WHERE image_urls IS NULL 
   OR image_urls = '' 
   OR image_urls = 'null';

-- Convert any string arrays to proper JSON format
UPDATE public.auctions 
SET image_urls = CASE 
    WHEN image_urls LIKE '[%]' THEN image_urls
    WHEN image_urls LIKE '"%"' THEN '["' || replace(replace(image_urls, '"', ''), '\\', '') || '"]'
    WHEN image_urls NOT LIKE '[%]' AND image_urls != '[]' THEN '["' || image_urls || '"]'
    ELSE image_urls
END
WHERE image_urls IS NOT NULL;

-- Convert the column type from TEXT to JSONB
ALTER TABLE public.auctions 
ALTER COLUMN image_urls TYPE jsonb 
USING CASE 
    WHEN image_urls IS NULL OR image_urls = '' THEN '[]'::jsonb
    WHEN image_urls::text ~ '^[\[\{]' THEN image_urls::jsonb
    ELSE ('["' || replace(image_urls::text, '"', '\\"') || '"]')::jsonb
END;

-- Set default value for new records
ALTER TABLE public.auctions 
ALTER COLUMN image_urls SET DEFAULT '[]'::jsonb;

-- Add constraint to ensure it's always an array
ALTER TABLE public.auctions 
ADD CONSTRAINT image_urls_is_array 
CHECK (jsonb_typeof(image_urls) = 'array');

-- Create index for better performance on image queries
CREATE INDEX IF NOT EXISTS idx_auctions_has_images 
ON public.auctions USING gin(image_urls) 
WHERE jsonb_array_length(image_urls) > 0;
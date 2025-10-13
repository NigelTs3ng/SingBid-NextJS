-- Add support for multiple images in auctions table
-- Change image_url to support JSON array of image URLs
ALTER TABLE auctions 
DROP COLUMN IF EXISTS image_url;

ALTER TABLE auctions 
ADD COLUMN images JSONB DEFAULT '[]'::jsonb;

-- Add index for better performance on images column
CREATE INDEX IF NOT EXISTS idx_auctions_images ON auctions USING GIN (images);

-- Add validation to ensure images is always an array
ALTER TABLE auctions 
ADD CONSTRAINT check_images_is_array 
CHECK (jsonb_typeof(images) = 'array');
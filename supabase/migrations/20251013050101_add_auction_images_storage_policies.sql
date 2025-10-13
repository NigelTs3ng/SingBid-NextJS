-- Enable RLS on storage.objects table for auction-images bucket
-- This allows us to create specific policies for the auction-images bucket

-- Policy to allow authenticated users to upload images to auction-images bucket
CREATE POLICY "Allow authenticated users to upload auction images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'auction-images');

-- Policy to allow authenticated users to update their own uploaded images
CREATE POLICY "Allow authenticated users to update auction images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'auction-images' AND auth.uid() = owner);

-- Policy to allow authenticated users to delete their own uploaded images
CREATE POLICY "Allow authenticated users to delete auction images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'auction-images' AND auth.uid() = owner);

-- Policy to allow public read access to auction images (since auctions are public)
CREATE POLICY "Allow public read access to auction images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'auction-images');

-- Alternative: If you want to restrict read access to authenticated users only, use this instead:
-- CREATE POLICY "Allow authenticated users to read auction images" ON storage.objects
-- FOR SELECT TO authenticated
-- USING (bucket_id = 'auction-images');
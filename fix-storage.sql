-- Fix Supabase Storage Configuration for auction-images bucket

-- Create the bucket if it doesn't exist and make sure it's public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('auction-images', 'auction-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Remove existing policies that might be conflicting
DROP POLICY IF EXISTS "Public read access for auction images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- Create new, working policies
CREATE POLICY "Public read access for auction images" ON storage.objects
    FOR SELECT USING (bucket_id = 'auction-images');

CREATE POLICY "Authenticated users can upload images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'auction-images' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can update their own images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'auction-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'auction-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

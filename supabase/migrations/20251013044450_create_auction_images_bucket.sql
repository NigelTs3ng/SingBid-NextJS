-- Create storage bucket for auction images (public access)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('auction-images', 'auction-images', true)
ON CONFLICT (id) DO NOTHING;
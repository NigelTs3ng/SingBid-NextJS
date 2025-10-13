-- Backfill existing auth.users into public.users table
INSERT INTO public.users (id, email, display_name, created_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'display_name', split_part(au.email, '@', 1)) as display_name,
  au.created_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
AND au.email IS NOT NULL;
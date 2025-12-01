-- Ensure users table has a stable role column
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS user_role VARCHAR(10) NOT NULL DEFAULT 'bidder'
  CHECK (user_role IN ('bidder','seller'));

-- Backfill existing sellers from seller_accounts
UPDATE users u
SET user_role = 'seller'
FROM seller_accounts sa
WHERE sa.user_id = u.id AND u.user_role <> 'seller';

-- Make user_role immutable (no silent flips)
CREATE OR REPLACE FUNCTION prevent_user_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.user_role <> OLD.user_role THEN
    RAISE EXCEPTION 'user_role is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_user_role_change ON users;
CREATE TRIGGER trg_prevent_user_role_change
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION prevent_user_role_change();

-- Update handle_new_user to persist role from metadata (defaults to bidder)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  role_text TEXT;
BEGIN
  role_text := COALESCE(NEW.raw_user_meta_data->>'user_role', 'bidder');
  IF role_text NOT IN ('bidder','seller') THEN
    role_text := 'bidder';
  END IF;

  INSERT INTO public.users (id, email, name, user_role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    role_text
  );
  RETURN NEW;
EXCEPTION WHEN others THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

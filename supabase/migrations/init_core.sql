-- Core schema for SingBid - Supabase
-- Run this in Supabase SQL editor or via CLI migration

-- Enable required extensions
create extension if not exists pgcrypto;

-- Users table (augmenting Supabase auth.users via profile table)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text,
  created_at timestamp with time zone default now()
);

-- Auctions
create table if not exists public.auctions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.users(id) on delete cascade,
  title text,
  description text,
  image_url text,
  starting_price numeric(10,2),
  current_price numeric(10,2) default 0,
  end_time timestamp with time zone,
  status text default 'active' check (status in ('active','ended','cancelled')),
  created_at timestamp with time zone default now()
);

-- Bids
create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid references public.auctions(id) on delete cascade,
  bidder_id uuid references public.users(id) on delete cascade,
  amount numeric(10,2) not null,
  created_at timestamp with time zone default now()
);

-- Payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid references public.auctions(id) on delete cascade,
  winner_id uuid references public.users(id) on delete set null,
  stripe_payment_intent_id text,
  amount numeric(10,2),
  status text default 'pending' check (status in ('pending','captured','failed')),
  captured_at timestamp with time zone
);

-- Payouts
create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.users(id) on delete cascade,
  auction_id uuid references public.auctions(id) on delete cascade,
  amount numeric(10,2),
  status text default 'pending' check (status in ('pending','paid','failed')),
  released_at timestamp with time zone
);

-- Indexes for performance
create index if not exists idx_auctions_status_end_time on public.auctions(status, end_time);
create index if not exists idx_bids_auction_time on public.bids(auction_id, created_at desc);
create index if not exists idx_payments_auction on public.payments(auction_id);
create index if not exists idx_payouts_seller on public.payouts(seller_id);

-- Row Level Security
alter table public.users enable row level security;
alter table public.auctions enable row level security;
alter table public.bids enable row level security;
alter table public.payments enable row level security;
alter table public.payouts enable row level security;

-- Policies: Only owners can modify their records; authenticated can read
-- Users: user can select/update their own row; insert allowed on signup flow
drop policy if exists users_select_self on public.users;
create policy users_select_self on public.users
  for select using (auth.uid() = id);

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update using (auth.uid() = id);

drop policy if exists users_insert_any_authed on public.users;
create policy users_insert_any_authed on public.users
  for insert with check (true);

-- Auctions: owners manage, anyone authenticated can read, authenticated can insert
drop policy if exists auctions_read_all on public.auctions;
create policy auctions_read_all on public.auctions
  for select using (true);

drop policy if exists auctions_insert_authed on public.auctions;
create policy auctions_insert_authed on public.auctions
  for insert with check (auth.role() = 'authenticated' and seller_id = auth.uid());

drop policy if exists auctions_update_owner on public.auctions;
create policy auctions_update_owner on public.auctions
  for update using (seller_id = auth.uid());

-- Bids: bidder manages own bids; everyone can read bids for an auction; insert by authed
drop policy if exists bids_read_all on public.bids;
create policy bids_read_all on public.bids
  for select using (true);

drop policy if exists bids_insert_authed on public.bids;
create policy bids_insert_authed on public.bids
  for insert with check (auth.role() = 'authenticated' and bidder_id = auth.uid());

drop policy if exists bids_update_owner on public.bids;
create policy bids_update_owner on public.bids
  for update using (bidder_id = auth.uid());

-- Payments: insert by server role; select own
drop policy if exists payments_select_owner on public.payments;
create policy payments_select_owner on public.payments
  for select using (winner_id = auth.uid());

drop policy if exists payments_insert_server on public.payments;
create policy payments_insert_server on public.payments
  for insert with check (auth.role() = 'service_role');

drop policy if exists payments_update_server on public.payments;
create policy payments_update_server on public.payments
  for update using (auth.role() = 'service_role');

-- Payouts: select by seller; updates by server
drop policy if exists payouts_select_seller on public.payouts;
create policy payouts_select_seller on public.payouts
  for select using (seller_id = auth.uid());

drop policy if exists payouts_insert_server on public.payouts;
create policy payouts_insert_server on public.payouts
  for insert with check (auth.role() = 'service_role');

drop policy if exists payouts_update_server on public.payouts;
create policy payouts_update_server on public.payouts
  for update using (auth.role() = 'service_role');

-- Realtime: enable on tables for bids and auctions price changes
-- In Supabase UI, enable Realtime for schema public on tables bids, auctions.

-- Function to end expired auctions (invoked by CRON or RPC)
create or replace function public.finalize_expired_auctions()
returns void
language plpgsql
security definer
as $$
declare
  r record;
begin
  for r in
    select a.id as auction_id
    from public.auctions a
    where a.status = 'active' and a.end_time <= now()
  loop
    update public.auctions set status = 'ended' where id = r.auction_id;
    -- Payment finalization should be handled by API route /api/auctions/finalize
  end loop;
end;
$$;

-- Optional: schedule via Supabase cron (configure in Dashboard → Edge Functions/cron)



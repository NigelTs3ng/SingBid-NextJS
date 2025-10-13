# SingBid Database Schema Documentation

## Project Details
- **Supabase Project**: singbid
- **Project ID**: xlpdgonjhspjdwutobgt
- **Region**: Southeast Asia (Singapore)
- **Dashboard**: https://supabase.com/dashboard/project/xlpdgonjhspjdwutobgt

## Schema Version: v1.0 (Initial Release)
**Migration File**: `20251013021526_init_core_schema.sql`
**Applied**: October 13, 2025

## Core Tables

### 1. users
Extends Supabase auth.users with additional profile information.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
```

**Purpose**: Store user profile information linked to Supabase auth
**Relationships**: Referenced by auctions, bids, payments, payouts

### 2. auctions
Main auction listings table with all auction details.

```sql
CREATE TABLE auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  starting_price DECIMAL(10,2) NOT NULL CHECK (starting_price > 0),
  current_price DECIMAL(10,2) DEFAULT 0,
  end_time TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','ended','cancelled')),
  created_at TIMESTAMP DEFAULT now()
);
```

**Purpose**: Store auction listings with pricing and timing information
**Key Features**:
- Automatic current_price updates via triggers
- Status validation (active/ended/cancelled)
- Price constraints (starting_price > 0)

### 3. bids
Individual bid records for auction participation.

```sql
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID REFERENCES auctions(id) ON DELETE CASCADE,
  bidder_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP DEFAULT now()
);
```

**Purpose**: Track all bids placed on auctions
**Key Features**:
- Self-bidding prevention via triggers
- Automatic auction price updates
- Cascading deletes

### 4. payments
Stripe payment intent tracking for winning bids.

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID REFERENCES auctions(id) ON DELETE CASCADE,
  winner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','captured','failed')),
  captured_at TIMESTAMP
);
```

**Purpose**: Track Stripe payments for auction winners
**Key Features**:
- Unique Stripe payment intent IDs
- Payment status tracking
- Capture timestamp recording

### 5. payouts
Seller payout tracking with delayed release.

```sql
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
  auction_id UUID REFERENCES auctions(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','failed')),
  released_at TIMESTAMP
);
```

**Purpose**: Manage seller payouts with 5-day holding period
**Key Features**:
- Delayed payout release (5 days)
- Platform fee deduction (5%)
- Status tracking for payout processing

## Row Level Security (RLS) Policies

All tables have RLS enabled with the following access patterns:

### Users Table
- **SELECT**: Users can view their own profile (`auth.uid() = id`)
- **UPDATE**: Users can update their own profile (`auth.uid() = id`)

### Auctions Table
- **SELECT**: Anyone can view active auctions, sellers can view their own
- **INSERT**: Users can create auctions (must be the seller)
- **UPDATE**: Sellers can update their own auctions

### Bids Table
- **SELECT**: Anyone can view bids on active auctions
- **INSERT**: Authenticated users can place bids (with business rules)

### Payments Table
- **SELECT**: Winners can view their own payments

### Payouts Table
- **SELECT**: Sellers can view their own payouts

## Database Functions & Triggers

### 1. update_auction_current_price()
**Purpose**: Automatically updates auction.current_price when new bids are placed
**Trigger**: `trigger_update_current_price` (AFTER INSERT ON bids)

```sql
CREATE OR REPLACE FUNCTION update_auction_current_price()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auctions 
  SET current_price = NEW.amount 
  WHERE id = NEW.auction_id 
  AND NEW.amount > current_price;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 2. prevent_self_bidding()
**Purpose**: Prevents users from bidding on their own auctions
**Trigger**: `trigger_prevent_self_bidding` (BEFORE INSERT ON bids)

```sql
CREATE OR REPLACE FUNCTION prevent_self_bidding()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM auctions 
    WHERE id = NEW.auction_id 
    AND seller_id = NEW.bidder_id
  ) THEN
    RAISE EXCEPTION 'Cannot bid on your own auction';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Performance Indexes

- `idx_auctions_status` - Filter by auction status
- `idx_auctions_end_time` - Sort by ending time
- `idx_auctions_seller_id` - Filter by seller
- `idx_bids_auction_id` - Join bids with auctions
- `idx_bids_bidder_id` - Filter bids by bidder
- `idx_bids_amount` - Sort bids by amount (DESC)
- `idx_payments_auction_id` - Join payments with auctions
- `idx_payments_stripe_intent` - Lookup by Stripe payment intent

## Change Log

### v1.0 - October 13, 2025 (Initial Schema)
- ✅ Created all core tables (users, auctions, bids, payments, payouts)
- ✅ Implemented RLS policies for data security
- ✅ Added performance indexes
- ✅ Created business logic functions and triggers
- ✅ Applied to hosted Supabase instance (xlpdgonjhspjdwutobgt)

## Future Schema Changes

When making schema changes, remember to:

1. **Create Migration**: `supabase migration new descriptive_name`
2. **Edit Migration File**: Add SQL changes to the timestamped file
3. **Apply to Remote**: `supabase db push`
4. **Update This Documentation**: Record the changes below
5. **Update TypeScript Types**: Regenerate types if needed

### Planned Changes
- [ ] Add image gallery support for multiple auction images
- [ ] Add user rating/feedback system
- [ ] Add auction categories taxonomy
- [ ] Add shipping/location details
- [ ] Add auction watch/favorite functionality

## Connection Details

The application connects to this hosted database using:
- **URL**: `https://xlpdgonjhspjdwutobgt.supabase.co`
- **Environment**: Production (hosted)
- **Real-time**: Enabled for live bidding updates
- **Auth**: Supabase Auth integration
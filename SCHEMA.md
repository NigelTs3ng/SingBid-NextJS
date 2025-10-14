# SingBid Database Schema Documentation

## Project Details
- **Supabase Project**: singbid
- **Project ID**: xlpdgonjhspjdwutobgt
- **Region**: Southeast Asia (Singapore)
- **Dashboard**: https://supabase.com/dashboard/project/xlpdgonjhspjdwutobgt

## Schema Version: v2.0 (Complete Production Schema)
**Latest Migration**: Multiple migrations including Stripe integration
**Last Updated**: January 2025

## Overview
This schema supports a complete auction platform with:
- ✅ User authentication and profiles
- ✅ Advanced auction management
- ✅ Stripe payment processing with escrow
- ✅ Seller verification and onboarding
- ✅ Dispute resolution system
- ✅ Notification system
- ✅ Social features (ratings, followers)
- ✅ Subscription management

## Core Tables

### 1. users
Extends Supabase auth.users with comprehensive user information.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone VARCHAR(20),
  email VARCHAR(255) UNIQUE,
  kyc_status VARCHAR(20) DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
  is_pro BOOLEAN DEFAULT FALSE,
  subscription_plan VARCHAR(50),
  stripe_account_id TEXT,
  stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Purpose**: Core user information linked to Supabase auth
**Key Features**:
- Direct reference to auth.users
- Stripe Connect integration
- KYC verification status
- Role-based access control

### 2. user_profiles
Extended user profile information and social features.

```sql
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  profile_image TEXT,
  bio TEXT,
  rating_average DECIMAL(3,2) DEFAULT 0 CHECK (rating_average >= 0 AND rating_average <= 5),
  rating_count INT DEFAULT 0 CHECK (rating_count >= 0),
  followers_count INT DEFAULT 0 CHECK (followers_count >= 0),
  following_count INT DEFAULT 0 CHECK (following_count >= 0),
  badges TEXT[],
  location VARCHAR(100),
  preferred_language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'Asia/Singapore',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Purpose**: Extended user profile and social features
**Key Features**:
- Automatic rating calculations
- Social metrics tracking
- Localization support

### 3. auctions
Comprehensive auction listings with advanced features.

```sql
CREATE TABLE auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  
  -- Pricing
  reserve DECIMAL(10,2) DEFAULT 0 CHECK (reserve >= 0),
  starting_bid DECIMAL(10,2) DEFAULT 0 CHECK (starting_bid >= 0),
  bid_increment DECIMAL(10,2) DEFAULT 1.00 CHECK (bid_increment > 0),
  buy_now_price DECIMAL(10,2) CHECK (buy_now_price > 0),
  
  -- Timing
  start_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Item details
  category VARCHAR(100) NOT NULL,
  condition VARCHAR(50) CHECK (condition IN ('new', 'like_new', 'excellent', 'good', 'fair', 'poor')),
  brand VARCHAR(100),
  model VARCHAR(100),
  
  -- Images
  image_url TEXT,
  image_urls JSONB DEFAULT '[]'::jsonb,
  
  -- Shipping & Location
  location VARCHAR(100) DEFAULT 'Singapore',
  shipping_method VARCHAR(50) CHECK (shipping_method IN ('pickup', 'local', 'nationwide', 'both')),
  shipping_cost DECIMAL(10,2) CHECK (shipping_cost >= 0),
  shipping_included BOOLEAN DEFAULT FALSE,
  shipping_notes TEXT,
  
  -- Policies
  return_policy TEXT,
  return_conditions TEXT,
  
  -- Requirements
  require_verified_phone BOOLEAN DEFAULT FALSE,
  require_min_rating BOOLEAN DEFAULT FALSE,
  min_rating DECIMAL(3,2) DEFAULT 0 CHECK (min_rating >= 0 AND min_rating <= 5),
  block_unpaid_buyers BOOLEAN DEFAULT FALSE,
  additional_requirements TEXT,
  
  -- Status & Metadata
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'canceled', 'suspended')),
  event_id UUID REFERENCES auction_events(id) ON DELETE SET NULL,
  scheduled BOOLEAN DEFAULT FALSE,
  featured BOOLEAN DEFAULT FALSE,
  views INT DEFAULT 0 CHECK (views >= 0),
  watchers_count INT DEFAULT 0 CHECK (watchers_count >= 0),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Purpose**: Comprehensive auction management
**Key Features**:
- Multiple pricing options (reserve, starting bid, buy now)
- Advanced item categorization
- Shipping and location management
- Seller requirements and verification
- Image gallery support
- Event scheduling

### 4. bids
Advanced bidding system with auto-bidding support.

```sql
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID REFERENCES auctions(id) ON DELETE CASCADE,
  bidder_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  is_auto_bid BOOLEAN DEFAULT FALSE,
  max_auto_bid DECIMAL(10,2),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Purpose**: Track all bids with advanced features
**Key Features**:
- Auto-bidding support
- IP tracking for security
- Self-bidding prevention via triggers

### 5. auto_bids
Auto-bidding configuration for users.

```sql
CREATE TABLE auto_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID REFERENCES auctions(id) ON DELETE CASCADE,
  bidder_id UUID REFERENCES users(id) ON DELETE CASCADE,
  max_amount DECIMAL(10,2) NOT NULL CHECK (max_amount > 0),
  increment DECIMAL(10,2) NOT NULL CHECK (increment > 0),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(auction_id, bidder_id)
);
```

**Purpose**: Configure automatic bidding behavior
**Key Features**:
- Maximum bid limits
- Increment configuration
- One auto-bid per user per auction

### 6. payments
Enhanced Stripe payment processing with escrow.

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  auction_id UUID REFERENCES auctions(id) ON DELETE SET NULL,
  intent_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) DEFAULT 'SGD',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled')),
  fee_applied DECIMAL(5,2) DEFAULT 0 CHECK (fee_applied >= 0),
  platform_fee DECIMAL(10,2) DEFAULT 0 CHECK (platform_fee >= 0),
  subscription_discount DECIMAL(5,2) DEFAULT 0 CHECK (subscription_discount >= 0),
  payment_method VARCHAR(50),
  failure_reason TEXT,
  stripe_transfer_id TEXT,
  capture_method VARCHAR(20) DEFAULT 'automatic',
  application_fee_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Purpose**: Comprehensive payment tracking with Stripe integration
**Key Features**:
- Stripe PaymentIntent integration
- Platform fee calculation
- Subscription discounts
- Escrow support

### 7. payouts
Seller payout management with escrow and fees.

```sql
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
  auction_id UUID REFERENCES auctions(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id),
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  status VARCHAR(20) DEFAULT 'on_hold' CHECK (status IN ('on_hold', 'processing', 'paid', 'failed', 'canceled')),
  stripe_transfer_id TEXT,
  released_at TIMESTAMP WITH TIME ZONE,
  hold_expires_at TIMESTAMP WITH TIME ZONE,
  hold_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Purpose**: Manage seller payouts with escrow protection
**Key Features**:
- 5-day escrow hold
- Stripe Connect integration
- Automatic release scheduling

### 8. disputes
Comprehensive dispute resolution system.

```sql
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID REFERENCES auctions(id) ON DELETE CASCADE,
  opener_id UUID REFERENCES users(id) ON DELETE CASCADE,
  respondent_id UUID REFERENCES users(id),
  reason TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'other' CHECK (category IN ('item_not_received', 'item_not_as_described', 'payment_issue', 'shipping_issue', 'other')),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  resolution TEXT,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  evidence_urls JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Purpose**: Handle disputes between buyers and sellers
**Key Features**:
- Categorized dispute types
- Evidence management
- Resolution tracking

## Additional Tables

### 9. auction_events
Scheduled auction events for bulk auctions.

```sql
CREATE TABLE auction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  scheduled_start TIMESTAMP WITH TIME ZONE,
  scheduled_end TIMESTAMP WITH TIME ZONE,
  min_items INT DEFAULT 10 CHECK (min_items > 0),
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'canceled')),
  banner_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### 10. outcomes
Auction results and winner determination.

```sql
CREATE TABLE outcomes (
  auction_id UUID PRIMARY KEY REFERENCES auctions(id) ON DELETE CASCADE,
  winner_id UUID REFERENCES users(id),
  final_price DECIMAL(10,2),
  winning_bid_id UUID REFERENCES bids(id),
  payment_intent_id TEXT,
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  captured_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### 11. ratings
User rating and review system.

```sql
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID REFERENCES auctions(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(auction_id, reviewer_id, target_user_id)
);
```

### 12. followers
Social following system.

```sql
CREATE TABLE followers (
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
  followed_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (follower_id, followed_user_id),
  CONSTRAINT no_self_follow CHECK (follower_id != followed_user_id)
);
```

### 13. auction_watchers
Users watching specific auctions.

```sql
CREATE TABLE auction_watchers (
  auction_id UUID REFERENCES auctions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (auction_id, user_id)
);
```

### 14. notifications
User notification system.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  message TEXT NOT NULL,
  link TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### 15. notification_preferences
User notification preferences.

```sql
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_new_bid BOOLEAN DEFAULT TRUE,
  email_outbid BOOLEAN DEFAULT TRUE,
  email_auction_ending BOOLEAN DEFAULT TRUE,
  email_auction_won BOOLEAN DEFAULT TRUE,
  email_payment_received BOOLEAN DEFAULT TRUE,
  push_new_bid BOOLEAN DEFAULT TRUE,
  push_outbid BOOLEAN DEFAULT TRUE,
  push_auction_ending BOOLEAN DEFAULT TRUE,
  sms_auction_won BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### 16. subscription_plans
Subscription plan definitions.

```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  monthly_fee DECIMAL(10,2) NOT NULL CHECK (monthly_fee >= 0),
  platform_fee_rate DECIMAL(5,2) DEFAULT 5.00 CHECK (platform_fee_rate >= 0 AND platform_fee_rate <= 100),
  benefits TEXT[],
  max_active_auctions INT,
  featured_listings_per_month INT DEFAULT 0,
  priority_support BOOLEAN DEFAULT FALSE,
  analytics_access BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### 17. subscriptions
User subscription tracking.

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_name VARCHAR(50),
  price DECIMAL(10,2),
  start_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired', 'suspended')),
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  auto_renew BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## Stripe Integration Tables

### 18. stripe_accounts
Stripe Connect account management.

```sql
CREATE TABLE stripe_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  stripe_account_id TEXT UNIQUE NOT NULL,
  account_type VARCHAR(20) DEFAULT 'express' CHECK (account_type IN ('express', 'custom', 'standard')),
  details_submitted BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  charges_enabled BOOLEAN DEFAULT FALSE,
  verification_status VARCHAR(20) DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  requirements_pending JSONB DEFAULT '[]'::jsonb,
  requirements_eventually_due JSONB DEFAULT '[]'::jsonb,
  requirements_currently_due JSONB DEFAULT '[]'::jsonb,
  country VARCHAR(2) DEFAULT 'SG',
  default_currency VARCHAR(3) DEFAULT 'SGD',
  business_type VARCHAR(50),
  business_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### 19. escrow_holds
Escrow management for buyer protection.

```sql
CREATE TABLE escrow_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  auction_id UUID REFERENCES auctions(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'released', 'disputed', 'expired')),
  hold_until TIMESTAMP WITH TIME ZONE NOT NULL,
  auto_release BOOLEAN DEFAULT TRUE,
  buyer_confirmed BOOLEAN DEFAULT FALSE,
  buyer_confirmed_at TIMESTAMP WITH TIME ZONE,
  dispute_opened BOOLEAN DEFAULT FALSE,
  release_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### 20. delivery_confirmations
Delivery confirmation tracking.

```sql
CREATE TABLE delivery_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID REFERENCES auctions(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
  confirmed BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  tracking_number TEXT,
  delivery_method VARCHAR(50),
  delivery_notes TEXT,
  delivery_photos JSONB DEFAULT '[]'::jsonb,
  auto_confirm_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### 21. payment_step_logs
Payment process tracking for compliance.

```sql
CREATE TABLE payment_step_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  step VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL,
  stripe_event_id TEXT,
  stripe_response JSONB,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  processed_by TEXT,
  processing_time_ms INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## Row Level Security (RLS) Policies

All tables have RLS enabled with comprehensive access patterns:

### Core Tables
- **users**: Users can view/update their own data
- **user_profiles**: Public read, owner write
- **auctions**: Public read for active auctions, owner full access
- **bids**: Public read, authenticated users can place bids
- **payments**: Users can view their own payments
- **payouts**: Sellers can view their own payouts

### Social Features
- **ratings**: Public read, authenticated users can create ratings
- **followers**: Public read, users can manage their own follows
- **notifications**: Users can view/update their own notifications

### Stripe Integration
- **stripe_accounts**: Users can manage their own Stripe accounts
- **escrow_holds**: Related parties can view relevant holds
- **payment_step_logs**: Users can view logs for their payments

## Database Functions & Triggers

### Core Business Logic

#### 1. prevent_self_bidding()
**Purpose**: Prevents users from bidding on their own auctions
**Trigger**: `trigger_prevent_self_bidding` (BEFORE INSERT ON bids)

#### 2. notify_new_bid()
**Purpose**: Sends notifications when new bids are placed
**Trigger**: `trigger_notify_new_bid` (AFTER INSERT ON bids)

#### 3. update_user_rating()
**Purpose**: Automatically updates user rating averages
**Trigger**: `trigger_update_user_rating` (AFTER INSERT/UPDATE/DELETE ON ratings)

#### 4. handle_new_user()
**Purpose**: Automatically creates user profiles on signup
**Trigger**: `on_auth_user_created` (AFTER INSERT ON auth.users)

### Stripe Payment Functions

#### 5. calculate_payment_fees()
**Purpose**: Automatically calculates platform and Stripe fees
**Trigger**: `trigger_calculate_payment_fees` (BEFORE INSERT/UPDATE ON payments)

#### 6. create_escrow_hold()
**Purpose**: Creates escrow holds when payments are captured
**Trigger**: `trigger_create_escrow_hold` (BEFORE UPDATE ON payments)

#### 7. process_escrow_releases()
**Purpose**: Processes automatic escrow releases after 5 days
**Function**: Called by cron job for automatic releases

## Performance Indexes

### Core Indexes
- `idx_auctions_seller` - Filter by seller
- `idx_auctions_category` - Filter by category
- `idx_auctions_status` - Filter by status
- `idx_auctions_end_at` - Sort by ending time
- `idx_auctions_featured` - Featured auctions
- `idx_auctions_search` - Full-text search

### Bidding Indexes
- `idx_bids_auction` - Join bids with auctions
- `idx_bids_bidder` - Filter bids by bidder
- `idx_bids_auction_amount` - Sort bids by amount
- `idx_bids_created_at` - Sort by bid time

### Payment Indexes
- `idx_payments_user` - Filter by user
- `idx_payments_status` - Filter by status
- `idx_payments_stripe_intent` - Stripe lookup

### Social Indexes
- `idx_user_profiles_username` - Username lookup
- `idx_user_profiles_rating` - Sort by rating
- `idx_ratings_target` - Filter by target user
- `idx_followers_user` - Follow relationships

## Storage Configuration

### Auction Images Bucket
- **Bucket**: `auction-images`
- **Access**: Public read, authenticated upload
- **Structure**: `{user_id}/{auction_id}/{filename}`
- **Policies**: Users can manage their own images

## Default Data

### Subscription Plans
- **Free Plan**: $0/month, 5% platform fee, 5 active auctions
- **Pro Plan**: $29.99/month, 3.5% platform fee, unlimited auctions
- **Premium Plan**: $99.99/month, 2% platform fee, advanced features

## Change Log

### v2.0 - January 2025 (Complete Production Schema)
- ✅ Enhanced user management with profiles and social features
- ✅ Comprehensive auction system with advanced features
- ✅ Complete Stripe payment integration with escrow
- ✅ Dispute resolution system
- ✅ Notification system with preferences
- ✅ Social features (ratings, followers, watchers)
- ✅ Subscription management
- ✅ Advanced RLS policies
- ✅ Performance optimizations
- ✅ Storage integration

### v1.0 - October 13, 2025 (Initial Schema)
- ✅ Created core tables (users, auctions, bids, payments, payouts)
- ✅ Implemented basic RLS policies
- ✅ Added performance indexes
- ✅ Created business logic functions and triggers

## Future Schema Changes

When making schema changes, remember to:

1. **Create Migration**: `supabase migration new descriptive_name`
2. **Edit Migration File**: Add SQL changes to the timestamped file
3. **Apply to Remote**: `supabase db push`
4. **Update This Documentation**: Record the changes below
5. **Update TypeScript Types**: Regenerate types if needed

### Planned Enhancements
- [ ] Advanced analytics and reporting tables
- [ ] Multi-currency support
- [ ] Auction categories taxonomy
- [ ] Advanced shipping integration
- [ ] Mobile app push notifications
- [ ] Advanced fraud detection

## Connection Details

The application connects to this hosted database using:
- **URL**: `https://xlpdgonjhspjdwutobgt.supabase.co`
- **Environment**: Production (hosted)
- **Real-time**: Enabled for live bidding updates
- **Auth**: Supabase Auth integration
- **Storage**: Supabase Storage for images
- **Edge Functions**: Available for cron jobs and webhooks
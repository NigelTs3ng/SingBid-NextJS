# Stripe Connect Setup Guide for BidWin

## âœ… What We've Implemented

### 1. **Stripe Connect for Sellers** 
- âœ… Stripe service utilities (`src/lib/stripe.ts`)
- âœ… API endpoint for Stripe Connect (`src/app/api/stripe-connect/route.ts`)
- âœ… Seller onboarding page (`src/pages/seller/stripe-connect.tsx`)
- âœ… Integration with seller dashboard
- âœ… Database schema for payment system

### 2. **Features Available**
- **Seller Account Creation**: Automatically creates Stripe Connect accounts
- **Onboarding Flow**: Redirects sellers to Stripe to complete KYC and banking setup
- **Status Tracking**: Checks if sellers can receive payments
- **Dashboard Integration**: "Connect Bank Account" button in seller dashboard

---

## ðŸ”§ **Setup Steps Required**

### Step 1: Set up Stripe Account
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Create a Stripe account or sign in
3. Switch to **Test Mode** for development
4. Get your API keys from: Dashboard â†’ Developers â†’ API keys

### Step 2: Update Environment Variables
Replace the placeholder keys in `.env.local`:

```bash
# Replace these with your actual Stripe keys
STRIPE_SECRET_KEY=sk_test_51xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 3: Run Database Migrations
Execute the SQL in `payment_schema.sql` in your Supabase database:

1. Go to Supabase Dashboard â†’ SQL Editor
2. Copy and paste the contents of `payment_schema.sql`
3. Click "Run" to create the payment tables

### Step 4: Test the Implementation
1. Restart your development server: `npm run dev`
2. Login as a seller
3. Go to Seller Dashboard
4. Click "Connect Bank Account"
5. Complete the Stripe onboarding flow

---

## ðŸŽ¯ **How It Works**

### Seller Onboarding Flow:
1. **Seller clicks "Connect Bank Account"** â†’ API creates Stripe Connect account
2. **Redirected to Stripe** â†’ Completes KYC, banking, and tax forms
3. **Returns to BidWin** â†’ Status updated, ready to receive payments
4. **Future auction sales** â†’ 95% goes to seller, 5% platform fee

### Database Changes:
- Added `stripe_account_id` and `stripe_onboarding_complete` to `users` table
- Created `payment_methods`, `payment_holds`, and `payments` tables
- Set up Row Level Security policies

---

## ðŸš€ **Next Steps for Full Payment System**

The remaining todos from our payment implementation plan:

1. **Payment Method Management for Bidders**
   - Add credit card management UI
   - Store payment methods securely

2. **Payment Authorization on Bids**
   - Pre-authorize payment when bid is placed
   - Release previous holds automatically

3. **Auction Completion Processing**
   - Capture payment from winner
   - Transfer to seller with platform fee

4. **Payment Tracking & Notifications**
   - Email notifications for payments
   - Dashboard for payment history

---

## ðŸ§ª **Testing the Current Implementation**

1. **As a Seller:**
   - Navigate to `/dashboard/seller`
   - Click "Connect Bank Account"
   - Complete Stripe onboarding
   - Verify status shows "Connected & Ready"

2. **Check Database:**
   - Verify `users.stripe_account_id` is populated
   - Confirm `stripe_onboarding_complete` is `true`

---

## ðŸ”’ **Security Notes**

- All Stripe operations use server-side API calls
- Service role key used to bypass RLS for payment operations
- User authentication required for all payment endpoints
- Stripe webhook endpoints will be needed for production

---

**Status: Stripe Connect for sellers is ready for testing!** ðŸŽ‰

Just add your Stripe keys and run the database migration to start testing the seller onboarding flow.
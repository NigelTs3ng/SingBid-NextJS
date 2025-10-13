# 🎯 **Complete Bidding Flow with Stripe Pre-Authorization**

## 📋 **Overview**
This implementation provides a secure, marketplace-grade bidding system that pre-authorizes payments when users place bids, ensuring they have sufficient funds and can complete payment if they win.

## 🔄 **Complete Bidding Flow**

### **Phase 1: User Places Bid**
1. **Click 'Place Bid'** → Opens payment method selection modal
2. **Form Validation** → Validates bid amount and user session
3. **Pre-authorization Request** → Creates Stripe PaymentIntent with `capture_method: manual`
4. **Bid Amount Lock** → Funds are held on user's card (not charged)
5. **Bid Recorded** → Bid is saved to Supabase `bids` table
6. **Realtime Update** → Platform updates in real-time (when enabled)
7. **Auction Continues** → Countdown continues, other users can outbid

### **Phase 2: Auction Ends**
8. **Winner Determined** → Highest bidder is automatically identified
9. **Payment Capture** → Winner's pre-authorized funds are captured
10. **Platform Escrow** → Funds held in platform balance for 5 days
11. **Buyer Protection** → Awaits buyer confirmation or auto-release after 5 days

## 🛠 **Technical Implementation**

### **Database Schema**
```sql
-- New tables created:
- bid_pre_authorizations  → Tracks payment pre-authorizations
- outbid_cleanups        → Manages canceled pre-auths when outbid
- auction_winners        → Final auction results and payment processing
- escrow_holds           → 5-day buyer protection holds
- payment_step_logs      → Audit trail for compliance
```

### **API Endpoints**
```javascript
// Bidding Flow
POST /api/bids/pre-authorize     // Step 1: Pre-authorize payment
POST /api/bids/place             // Step 2: Place bid with pre-auth
POST /api/bids/cleanup-outbid    // Background: Cancel outbid pre-auths

// Auction Completion
POST /api/auctions/complete      // Process auction end and capture payment

// Payment Processing
POST /api/payments/capture       // Capture winner's payment
POST /api/payments/release       // Release funds to seller
POST /api/payments/refund        // Handle disputes
```

### **Frontend Components**
- **BiddingPanel.jsx** → Enhanced with pre-authorization flow
- **Payment Method Modal** → Secure payment method selection
- **Pre-auth Status Indicator** → Shows active fund reservations

## 🔐 **Security Features**

### **Payment Security**
- ✅ **Pre-authorization** → Verifies funds before bidding
- ✅ **No fake bids** → Only users with valid payment methods can bid
- ✅ **Automatic cleanup** → Outbid users' holds are canceled immediately
- ✅ **5-day escrow** → Buyer protection with dispute resolution

### **Fraud Prevention**
- ✅ **Self-bidding prevention** → Users can't bid on own auctions
- ✅ **Payment method verification** → Real payment methods required
- ✅ **Stripe Connect compliance** → Full KYC for sellers
- ✅ **Audit trail** → Complete payment history tracking

## 💰 **Money Flow**

```
1. USER BIDS
   Card → PRE-AUTHORIZED (held, not charged)
   
2. USER GETS OUTBID
   Pre-auth → AUTOMATICALLY CANCELED
   
3. AUCTION ENDS
   Winner's pre-auth → CAPTURED (money taken)
   
4. ESCROW PERIOD
   Captured funds → PLATFORM HOLD (5 days)
   
5. DELIVERY CONFIRMED
   Platform hold → SELLER (minus 5% fee)
   Platform keeps → 5% COMMISSION
```

## 🚀 **Setup Instructions**

### **1. Database Migration**
Run the migration script to create required tables:
```bash
# Apply the migration in your Supabase SQL editor
cat stripe-migration.sql | supabase db reset --local
```

### **2. Environment Variables**
Add to your `.env.local`:
```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Platform Configuration
STRIPE_PLATFORM_FEE_RATE=5.0  # 5% platform fee
```

### **3. Stripe Configuration**
```javascript
// lib/stripe.js configuration
export const STRIPE_CONFIG = {
  currency: 'SGD',
  platformFeeRate: 5.0, // 5%
  preAuthExpiryHours: 24,
  escrowHoldDays: 5
};
```

### **4. Background Jobs**
Set up cleanup job for outbid pre-authorizations:
```bash
# Run every 5 minutes
*/5 * * * * curl -X POST https://your-domain.com/api/bids/cleanup-outbid
```

## 🧪 **Testing Flow**

### **Test Scenario 1: Successful Bidding**
```javascript
// 1. User A places bid of $100
// 2. Pre-auth holds $100 on User A's card
// 3. User B places bid of $150  
// 4. User A's pre-auth is canceled, User B's $150 is held
// 5. Auction ends, User B wins
// 6. $150 is captured from User B's card
// 7. $142.50 goes to seller (after 5% fee), $7.50 to platform
```

### **Test Scenario 2: Outbid Handling**
```javascript
// 1. User places $100 bid → $100 pre-authorized
// 2. Another user bids $150 → First user's $100 pre-auth canceled
// 3. No charge to outbid user, funds released immediately
```

## 📊 **Monitoring & Analytics**

### **Key Metrics**
- Pre-authorization success rate
- Bid conversion rate (pre-auth → actual bid)
- Payment capture success rate
- Average escrow hold duration
- Platform revenue from fees

### **Error Handling**
- Failed pre-authorizations → User notified to try different card
- Outbid cleanup failures → Automatic retry with exponential backoff
- Payment capture failures → Auction winner notified, seller protected

## 🎉 **Benefits**

### **For Users**
- **No fake bids** → All bidders have verified payment methods
- **Immediate bidding** → No payment setup delays during auction
- **Buyer protection** → 5-day dispute period
- **Transparent fees** → Clear fee structure

### **For Platform**
- **Guaranteed revenue** → 5% fee on all successful auctions
- **Reduced disputes** → Pre-verified payment methods
- **Compliance ready** → Full audit trail and KYC
- **Scalable** → Handles high-volume bidding

### **For Sellers**
- **Payment guaranteed** → Funds pre-authorized before auction ends
- **Quick payouts** → Automatic release after buyer protection period
- **Fraud protection** → Only verified bidders can participate

## 🔧 **Advanced Configuration**

### **Custom Fee Structure**
```javascript
// Modify in stripe.js
export const STRIPE_CONFIG = {
  platformFeeRate: 3.0, // 3% instead of 5%
  minimumFee: 1.00,      // Minimum $1 fee
  maximumFee: 100.00     // Maximum $100 fee
};
```

### **Extended Escrow Period**
```javascript
// Modify escrow period
const escrowDays = 7; // 7 days instead of 5
```

This implementation provides a production-ready, secure bidding system that ensures payment reliability while maintaining excellent user experience!
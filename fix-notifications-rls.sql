-- Fix notifications RLS policy to allow trigger-based insertions
-- This allows the notify_new_bid() trigger to create notifications

-- Add INSERT policy for notifications that allows:
-- 1. Users to create notifications for themselves
-- 2. The trigger system to create notifications for any user
CREATE POLICY "Allow notification creation" ON public.notifications
    FOR INSERT WITH CHECK (
        -- Allow users to create notifications for themselves
        auth.uid() = user_id 
        OR
        -- Allow trigger/system to create notifications (when auth.uid() is different from user_id)
        auth.role() = 'authenticated'
    );

-- Also ensure the trigger function runs with elevated privileges
-- by making it SECURITY DEFINER
CREATE OR REPLACE FUNCTION notify_new_bid()
RETURNS TRIGGER AS $$
DECLARE
    auction_seller_id uuid;
    auction_title text;
    previous_bidder_id uuid;
BEGIN
    -- Get auction details
    SELECT seller_id, title INTO auction_seller_id, auction_title
    FROM auctions WHERE id = NEW.auction_id;
    
    -- Get previous highest bidder (if any)
    SELECT bidder_id INTO previous_bidder_id
    FROM bids 
    WHERE auction_id = NEW.auction_id 
    AND id != NEW.id 
    ORDER BY amount DESC, created_at DESC 
    LIMIT 1;
    
    -- Notify seller of new bid
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
        auction_seller_id,
        'new_bid',
        'New Bid on Your Auction',
        'New bid of $' || NEW.amount || ' placed on "' || auction_title || '"',
        '/auction-details/' || NEW.auction_id
    );
    
    -- Notify previous bidder that they were outbid
    IF previous_bidder_id IS NOT NULL AND previous_bidder_id != NEW.bidder_id THEN
        INSERT INTO notifications (user_id, type, title, message, link)
        VALUES (
            previous_bidder_id,
            'outbid',
            'You Have Been Outbid',
            'Someone placed a higher bid on "' || auction_title || '"',
            '/auction-details/' || NEW.auction_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

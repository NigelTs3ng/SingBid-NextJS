export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
        }
      }
      auctions: {
        Row: {
          id: string
          seller_id: string
          title: string
          description: string
          image_url?: string
          starting_price: number
          starting_bid: number
          end_time: string
          status: 'active' | 'ended' | 'cancelled'
          created_at: string
        }
        Insert: {
          id?: string
          seller_id: string
          title: string
          description: string
          image_url?: string
          starting_price: number
          starting_bid?: number
          end_time: string
          status?: 'active' | 'ended' | 'cancelled'
          created_at?: string
        }
        Update: {
          id?: string
          seller_id?: string
          title?: string
          description?: string
          image_url?: string
          starting_price?: number
          starting_bid?: number
          end_time?: string
          status?: 'active' | 'ended' | 'cancelled'
          created_at?: string
        }
      }
      bids: {
        Row: {
          id: string
          auction_id: string
          bidder_id: string
          amount: number
          created_at: string
        }
        Insert: {
          id?: string
          auction_id: string
          bidder_id: string
          amount: number
          created_at?: string
        }
        Update: {
          id?: string
          auction_id?: string
          bidder_id?: string
          amount?: number
          created_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          auction_id: string
          winner_id: string
          stripe_payment_intent_id: string
          amount: number
          status: 'pending' | 'captured' | 'failed'
          captured_at?: string
        }
        Insert: {
          id?: string
          auction_id: string
          winner_id: string
          stripe_payment_intent_id: string
          amount: number
          status?: 'pending' | 'captured' | 'failed'
          captured_at?: string
        }
        Update: {
          id?: string
          auction_id?: string
          winner_id?: string
          stripe_payment_intent_id?: string
          amount?: number
          status?: 'pending' | 'captured' | 'failed'
          captured_at?: string
        }
      }
      payouts: {
        Row: {
          id: string
          seller_id: string
          auction_id: string
          amount: number
          status: 'pending' | 'paid' | 'failed'
          released_at?: string
        }
        Insert: {
          id?: string
          seller_id: string
          auction_id: string
          amount: number
          status?: 'pending' | 'paid' | 'failed'
          released_at?: string
        }
        Update: {
          id?: string
          seller_id?: string
          auction_id?: string
          amount?: number
          status?: 'pending' | 'paid' | 'failed'
          released_at?: string
        }
      }
    }
  }
}
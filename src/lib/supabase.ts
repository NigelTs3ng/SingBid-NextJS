import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true
  }
})

// Database types
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          user_role: 'bidder' | 'seller'
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          user_role: 'bidder' | 'seller'
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          user_role?: 'bidder' | 'seller'
          stripe_customer_id?: string | null
          updated_at?: string
        }
      }
      auctions: {
        Row: {
          id: string
          title: string
          description: string
          starting_price: number
          current_price: number
          seller_id: string
          status: 'active' | 'ended' | 'cancelled'
          end_time: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          starting_price: number
          current_price?: number
          seller_id: string
          status?: 'active' | 'ended' | 'cancelled'
          end_time: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          starting_price?: number
          current_price?: number
          seller_id?: string
          status?: 'active' | 'ended' | 'cancelled'
          end_time?: string
          updated_at?: string
        }
      }
      auction_images: {
        Row: {
          id: string
          auction_id: string
          image_url: string
          image_path: string | null
          display_order: number
          is_primary: boolean
          alt_text: string | null
          file_size: number | null
          mime_type: string | null
          width: number | null
          height: number | null
          created_at: string
        }
        Insert: {
          id?: string
          auction_id: string
          image_url: string
          image_path?: string | null
          display_order?: number
          is_primary?: boolean
          alt_text?: string | null
          file_size?: number | null
          mime_type?: string | null
          width?: number | null
          height?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          auction_id?: string
          image_url?: string
          image_path?: string | null
          display_order?: number
          is_primary?: boolean
          alt_text?: string | null
          file_size?: number | null
          mime_type?: string | null
          width?: number | null
          height?: number | null
        }
      }
      bids: {
        Row: {
          id: string
          auction_id: string
          bidder_id: string
          amount: number
          status: 'active' | 'cancelled' | 'winning' | 'outbid'
          created_at: string
          payment_method: 'card' | 'bidcoin' | 'hybrid' | null
          stripe_payment_intent_id: string | null
          bidcoin_hold: number
          holds_released: boolean | null
          authorization_status: string | null
          authorized_amount: number | null
        }
        Insert: {
          id?: string
          auction_id: string
          bidder_id: string
          amount: number
          status?: 'active' | 'cancelled' | 'winning' | 'outbid'
          created_at?: string
          payment_method?: 'card' | 'bidcoin' | 'hybrid' | null
          stripe_payment_intent_id?: string | null
          bidcoin_hold?: number
          holds_released?: boolean | null
          authorization_status?: string | null
          authorized_amount?: number | null
        }
        Update: {
          id?: string
          auction_id?: string
          bidder_id?: string
          amount?: number
          status?: 'active' | 'cancelled' | 'winning' | 'outbid'
          payment_method?: 'card' | 'bidcoin' | 'hybrid' | null
          stripe_payment_intent_id?: string | null
          bidcoin_hold?: number
          holds_released?: boolean | null
          authorization_status?: string | null
          authorized_amount?: number | null
        }
      }
      user_bidcoins: {
        Row: {
          user_id: string
          balance: number
          updated_at: string
          created_at: string
        }
        Insert: {
          user_id: string
          balance?: number
          updated_at?: string
          created_at?: string
        }
        Update: {
          user_id?: string
          balance?: number
          updated_at?: string
          created_at?: string
        }
      }
      bidcoin_transactions: {
        Row: {
          id: string
          user_id: string
          change: number
          balance_after: number
          type: string
          reference_id: string | null
          reference_table: string | null
          usd_value: string
          metadata: any
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          change: number
          balance_after: number
          type: string
          reference_id?: string | null
          reference_table?: string | null
          metadata?: any
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          change?: number
          balance_after?: number
          type?: string
          reference_id?: string | null
          reference_table?: string | null
          metadata?: any
          created_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          auction_id: string
          buyer_id: string
          seller_id: string
          amount: number
          platform_fee: number
          seller_amount: number
          stripe_payment_intent_id: string | null
          stripe_transfer_id: string | null
          payment_method: 'card' | 'bidcoin' | 'hybrid'
          bidcoin_amount: number
          status: 'pending' | 'completed' | 'failed' | 'refunded'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auction_id: string
          buyer_id: string
          seller_id: string
          amount: number
          platform_fee: number
          seller_amount: number
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          payment_method?: 'card' | 'bidcoin' | 'hybrid'
          bidcoin_amount?: number
          status?: 'pending' | 'completed' | 'failed' | 'refunded'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auction_id?: string
          buyer_id?: string
          seller_id?: string
          amount?: number
          platform_fee?: number
          seller_amount?: number
          stripe_payment_intent_id?: string
          stripe_transfer_id?: string | null
          payment_method?: 'card' | 'bidcoin' | 'hybrid'
          bidcoin_amount?: number
          status?: 'pending' | 'completed' | 'failed' | 'refunded'
          updated_at?: string
        }
      }
      seller_accounts: {
        Row: {
          id: string
          user_id: string
          stripe_account_id: string
          account_status: 'pending' | 'active' | 'rejected'
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_account_id: string
          account_status?: 'pending' | 'active' | 'rejected'
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_account_id?: string
          account_status?: 'pending' | 'active' | 'rejected'
          onboarding_completed?: boolean
          updated_at?: string
        }
      }
      ,
      payouts: {
        Row: {
          id: string
          seller_id: string
          status: 'requested' | 'processing' | 'paid' | 'failed' | 'cancelled'
          amount_total: number
          fee_total: number
          currency: string
          destination_account_id: string | null
          stripe_payout_id: string | null
          notes: string | null
          requested_at: string
          processed_at: string | null
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          seller_id: string
          status?: 'requested' | 'processing' | 'paid' | 'failed' | 'cancelled'
          amount_total: number
          fee_total?: number
          currency?: string
          destination_account_id?: string | null
          stripe_payout_id?: string | null
          notes?: string | null
          requested_at?: string
          processed_at?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          seller_id?: string
          status?: 'requested' | 'processing' | 'paid' | 'failed' | 'cancelled'
          amount_total?: number
          fee_total?: number
          currency?: string
          destination_account_id?: string | null
          stripe_payout_id?: string | null
          notes?: string | null
          requested_at?: string
          processed_at?: string | null
          paid_at?: string | null
          updated_at?: string
        }
      }
      ,
      payout_items: {
        Row: {
          id: string
          payout_id: string
          payment_id: string
          amount: number
          created_at: string
        }
        Insert: {
          id?: string
          payout_id: string
          payment_id: string
          amount: number
          created_at?: string
        }
        Update: {
          id?: string
          payout_id?: string
          payment_id?: string
          amount?: number
        }
      }
    }
  }
}

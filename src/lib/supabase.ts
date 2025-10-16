import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
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
          status: 'active' | 'cancelled' | 'winning'
          created_at: string
        }
        Insert: {
          id?: string
          auction_id: string
          bidder_id: string
          amount: number
          status?: 'active' | 'cancelled' | 'winning'
          created_at?: string
        }
        Update: {
          id?: string
          auction_id?: string
          bidder_id?: string
          amount?: number
          status?: 'active' | 'cancelled' | 'winning'
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
          stripe_payment_intent_id: string
          stripe_transfer_id: string | null
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
          stripe_payment_intent_id: string
          stripe_transfer_id?: string | null
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
    }
  }
}
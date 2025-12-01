import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './supabase'

// Create a singleton instance to avoid multiple clients
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('Creating Supabase browser client singleton');
  
  if (!url || !key) {
    console.error('Missing Supabase environment variables!');
    throw new Error('Missing Supabase environment variables');
  }
  
  supabaseInstance = createBrowserClient<Database>(url, key);
  return supabaseInstance;
}

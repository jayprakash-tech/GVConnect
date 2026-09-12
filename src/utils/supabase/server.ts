import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client.
 * In a Vite SPA context, this is available but should only be used
 * in server-side rendering contexts or API routes.
 * 
 * For production with a server component, use service role key (server only).
 * For now, this re-exports the anon client for consistency.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl) {
  throw new Error('Missing environment variable: VITE_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  throw new Error('Missing environment variable: VITE_SUPABASE_ANON_KEY');
}

export const createServerClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });
};

import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

function isPlaceholderValue(val: string): boolean {
  const lower = val.toLowerCase();
  return (
    !lower ||
    lower.includes('placeholder') ||
    lower.includes('your-project') ||
    lower.includes('your_project') ||
    lower.includes('your-supabase') ||
    lower.includes('example.supabase.co') ||
    lower.includes('xxx') ||
    lower.includes('<')
  );
}

function isValidHttpUrl(val: string): boolean {
  try {
    const parsed = new URL(val);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = Boolean(
  !isPlaceholderValue(rawUrl) &&
    !isPlaceholderValue(rawAnonKey) &&
    isValidHttpUrl(rawUrl)
);

const supabaseUrl = isSupabaseConfigured ? rawUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = isSupabaseConfigured ? rawAnonKey : 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

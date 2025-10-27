import { createClient } from '@supabase/supabase-js';

const supabaseUrl = typeof window !== 'undefined' 
  ? (import.meta as any).env?.VITE_SUPABASE_URL 
  : process.env.VITE_SUPABASE_URL;

const supabaseAnonKey = typeof window !== 'undefined' 
  ? (import.meta as any).env?.VITE_SUPABASE_ANON_KEY 
  : process.env.VITE_SUPABASE_ANON_KEY;

const finalUrl = supabaseUrl;
const finalKey = supabaseAnonKey;

export const supabase = createClient(finalUrl, finalKey);
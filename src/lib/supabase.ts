import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default Supabase project credentials provided
export const DEFAULT_SUPABASE_URL = 'https://vdztuolooipujdoshygg.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkenR1b2xvb2lwdWpkb3NoeWdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2NDIwNTMsImV4cCI6MjEwNjIxODA1M30.xW-UYNkMby_OtsbYQyOp2hvJJCfpRA1OG7oUV4wi-u0';

// Retrieve credentials from environment variables, localStorage override, or default constants
const getStoredConfig = () => {
  try {
    const storedUrl = localStorage.getItem('app_supabase_url');
    const storedKey = localStorage.getItem('app_supabase_anon_key');
    return {
      url: storedUrl || import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL,
      key: storedKey || import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY
    };
  } catch {
    return {
      url: import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL,
      key: import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY
    };
  }
};

const config = getStoredConfig();

export const isSupabaseConfigured = (): boolean => {
  const current = getStoredConfig();
  return Boolean(
    current.url && 
    current.key && 
    !current.url.includes('your-project') &&
    !current.key.includes('your-anon-public-key') &&
    current.url.startsWith('https://')
  );
};

let clientInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  const current = getStoredConfig();
  const valid = isSupabaseConfigured();

  if (!clientInstance || !valid) {
    if (valid) {
      clientInstance = createClient(current.url, current.key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        }
      });
    } else {
      // Fallback placeholder client that satisfies typing; real operations route through unified data service
      clientInstance = createClient(
        current.url || 'https://placeholder.supabase.co',
        current.key || 'placeholder-anon-key'
      );
    }
  }
  return clientInstance;
};

export const updateSupabaseConfig = (url: string, key: string) => {
  localStorage.setItem('app_supabase_url', url.trim());
  localStorage.setItem('app_supabase_anon_key', key.trim());
  clientInstance = null; // force re-creation
  return getSupabase();
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem('app_supabase_url');
  localStorage.removeItem('app_supabase_anon_key');
  clientInstance = null;
};

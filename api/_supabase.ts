import { createClient } from '@supabase/supabase-js';

export function getSupabase() {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const enabled = Boolean(url && key);
  const client = enabled ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return { enabled, client };
}

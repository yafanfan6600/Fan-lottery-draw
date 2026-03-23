import { getSupabase } from './_supabase';

export default async function handler(req: any, res: any) {
  const { enabled, client } = getSupabase();
  if (!enabled || !client) return res.status(503).json({ error: 'Supabase not configured' });
  const { count, error } = await client.from('draws').select('id', { count: 'exact', head: true });
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ totalBlessings: count || 0 });
}

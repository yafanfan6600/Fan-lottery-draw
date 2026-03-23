import { getSupabase } from './_supabase';

export default async function handler(req: any, res: any) {
  const { enabled, client } = getSupabase();
  const status: any = { supabaseConfigured: enabled };
  if (enabled && client) {
    try {
      const { count, error } = await client.from('draws').select('id', { count: 'exact', head: true });
      status.dbOk = !error;
      if (error) status.dbError = error.message;
      status.drawsCount = count ?? null;
    } catch (e: any) {
      status.dbOk = false;
      status.dbError = e?.message || 'unknown';
    }
  }
  res.status(200).json(status);
}

import { getSupabase } from './_supabase';

export default async function handler(req: any, res: any) {
  const { enabled, client } = getSupabase();
  if (!enabled || !client) return res.status(503).json({ error: 'Supabase not configured' });
  const { data: draws, error } = await client
    .from('draws')
    .select('id, draw_time, winners')
    .order('draw_time', { ascending: false })
    .limit(100);
  if (error) return res.status(500).json({ error: error.message });
  const result = (draws || []).map((d: any) => ({
    id: d.id,
    date: new Date(d.draw_time).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    winners: d.winners || [],
  }));
  return res.status(200).json(result);
}

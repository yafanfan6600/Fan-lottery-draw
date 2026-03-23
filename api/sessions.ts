import { getSupabase } from './_supabase';

export default async function handler(req: any, res: any) {
  const { enabled, client } = getSupabase();
  if (!enabled || !client) return res.status(503).json({ error: 'Supabase not configured' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const winners = Array.isArray(req.body?.winners) ? req.body.winners : [];
  if (!Array.isArray(winners) || winners.length === 0) {
    return res.status(400).json({ error: 'winners is required' });
  }
  const { data: draw, error } = await client
    .from('draws')
    .insert([{ winners }])
    .select('id, draw_time, winners')
    .single();
  if (error || !draw) return res.status(500).json({ error: error?.message || 'insert failed' });
  const record = {
    id: draw.id,
    date: new Date(draw.draw_time).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    winners: draw.winners || winners,
  };
  return res.status(201).json(record);
}

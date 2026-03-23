import express from 'express';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const app = express();
app.use(express.json({ limit: '1mb' }));

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseEnabled = Boolean(supabaseUrl && supabaseServiceKey);
const supabase = supabaseEnabled
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : (null as any);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, supabase: supabaseEnabled });
});

app.get('/api/stats', async (_req, res) => {
  if (!supabaseEnabled) return res.status(503).json({ error: 'Supabase not configured' });
  const { count, error } = await supabase
    .from('draws')
    .select('id', { count: 'exact', head: true });
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ totalBlessings: count || 0 });
});

app.get('/api/history', async (_req, res) => {
  if (!supabaseEnabled) return res.status(503).json({ error: 'Supabase not configured' });
  const { data: draws, error } = await supabase
    .from('draws')
    .select('id, draw_time, winners')
    .order('draw_time', { ascending: false })
    .limit(100);
  if (error) return res.status(500).json({ error: error.message });
  const result = (draws || []).map(d => ({
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
  return res.json(result);
});

app.post('/api/sessions', async (req, res) => {
  if (!supabaseEnabled) return res.status(503).json({ error: 'Supabase not configured' });
  const winners = Array.isArray(req.body?.winners) ? req.body.winners : [];
  if (!Array.isArray(winners) || winners.length === 0) {
    return res.status(400).json({ error: 'winners is required' });
  }
  const { data: draw, error } = await supabase
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
});

app.listen(port, () => {
  // no-op
});


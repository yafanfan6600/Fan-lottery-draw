import { getSupabase } from './_supabase';

export default function handler(req: any, res: any) {
  const { enabled } = getSupabase();
  res.status(200).json({ ok: true, supabase: enabled });
}

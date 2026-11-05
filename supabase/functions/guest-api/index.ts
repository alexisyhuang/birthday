import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') ?? '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SECRET_KEY')!);
async function digest(token: string) { const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)); return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join(''); }
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);
  try {
    const body = await req.json();
    const token = typeof body.token === 'string' ? body.token : '';
    if (token.length < 32 || token.length > 256) return json({ error: 'Invalid invitation link.' }, 401);
    const { data: guest, error } = await db.from('guests').select('id,name,rsvp_status').eq('invitation_token_hash', await digest(token)).maybeSingle();
    if (error || !guest) return json({ error: 'Invalid invitation link.' }, 401);
    const action = body.action;
    if (action === 'verify') {
      const [{ data: outfit }, { data: latest }] = await Promise.all([
        db.from('outfits').select('character_id,accessory').eq('guest_id', guest.id).maybeSingle(),
        db.from('game_submissions').select('score').eq('guest_id', guest.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      return json({ guest: { id: guest.id, name: guest.name }, rsvp: guest.rsvp_status, outfit: outfit ?? null, latestScore: latest?.score ?? null });
    }
    if (action === 'rsvp') {
      if (body.status !== 'yes' && body.status !== 'no') return json({ error: 'RSVP must be yes or no.' }, 400);
      const { error: updateError } = await db.from('guests').update({ rsvp_status: body.status }).eq('id', guest.id);
      if (updateError) throw updateError;
      return json({ rsvp: body.status });
    }
    if (action === 'outfit') {
      const ids = ['bear', 'cat', 'dog', 'snowman'];
      const accessories = ['bow', 'hat', 'scarf', 'sparkle'];
      if (!ids.includes(body.character_id) || (body.accessory !== null && !accessories.includes(body.accessory))) return json({ error: 'Invalid outfit selection.' }, 400);
      const { error: saveError } = await db.from('outfits').upsert({ guest_id: guest.id, character_id: body.character_id, accessory: body.accessory }, { onConflict: 'guest_id' });
      if (saveError) throw saveError;
      return json({ saved: true });
    }
    if (action === 'submit-drawing') {
      if (typeof body.game_id !== 'string' || typeof body.image_base64 !== 'string' || body.image_base64.length > 7_000_000) return json({ error: 'Invalid drawing submission.' }, 400);
      const { data: prompt } = await db.from('game_prompts').select('id').eq('id', body.game_id).eq('active', true).maybeSingle();
      if (!prompt) return json({ error: 'Unknown drawing prompt.' }, 400);
      const match = body.image_base64.match(/^data:image\/(png|jpeg|webp);base64,([\s\S]+)$/);
      if (!match) return json({ error: 'Drawing must be a PNG, JPEG, or WebP.' }, 400);
      const raw = atob(match[2]);
      if (raw.length > 5 * 1024 * 1024) return json({ error: 'Drawing is too large.' }, 413);
      const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
      const path = `${guest.id}/${crypto.randomUUID()}.${match[1]}`;
      const { error: uploadError } = await db.storage.from('drawings').upload(path, bytes, { contentType: `image/${match[1]}`, upsert: false });
      if (uploadError) throw uploadError;
      const { data: submission, error: insertError } = await db.from('game_submissions').insert({ guest_id: guest.id, game_id: prompt.id, drawing_storage_path: path }).select('id,score,created_at').single();
      if (insertError) { await db.storage.from('drawings').remove([path]); throw insertError; }
      return json({ submission, message: 'Drawing saved. Score pending server-side scoring.' }, 201);
    }
    if (action === 'leaderboard') {
      const { data, error: leaderboardError } = await db.from('game_submissions').select('score,created_at,guests(name)').not('score', 'is', null).order('score', { ascending: false }).order('created_at', { ascending: true }).limit(10);
      if (leaderboardError) throw leaderboardError;
      return json({ leaderboard: data ?? [] });
    }
    return json({ error: 'Unknown action.' }, 400);
  } catch (e) { console.error(e); return json({ error: 'Request could not be completed.' }, 500); }
});

import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') ?? '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const secretKey = (JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>).default;
if (!secretKey) throw new Error('Supabase default secret API key is unavailable.');
const db = createClient(Deno.env.get('SUPABASE_URL')!, secretKey);
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
      const [{ data: outfit }, { data: latest }, { data: questionnaire }] = await Promise.all([
        db.from('outfits').select('character_id,accessory').eq('guest_id', guest.id).maybeSingle(),
        db.from('game_submissions').select('score').eq('guest_id', guest.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        db.from('guest_questionnaires').select('answers').eq('guest_id', guest.id).maybeSingle(),
      ]);
      return json({ guest: { id: guest.id, name: guest.name }, rsvp: guest.rsvp_status, outfit: outfit ?? null, questionnaire: questionnaire?.answers ?? {}, latestScore: latest?.score ?? null });
    }
    if (action === 'rsvp') {
      if (body.status !== 'yes' && body.status !== 'no') return json({ error: 'RSVP must be yes or no.' }, 400);
      const { error: updateError } = await db.from('guests').update({ rsvp_status: body.status }).eq('id', guest.id);
      if (updateError) throw updateError;
      return json({ rsvp: body.status });
    }
    if (action === 'questionnaire') {
      const answers = body.answers;
      const textFields = ['annoying_song', 'holiday_movie', 'favorite_dessert', 'regift_item', 'christmas_association', 'overrated_restaurant', 'party_excuse', 'allie_association'];
      const numberLimits: Record<string, number> = { weekday_job_hours: 1000, unread_emails: 1_000_000, unread_texts: 1_000_000, allie_spiritual_age: 1000 };
      const allowedFields = [...textFields, ...Object.keys(numberLimits), 'name_preference'];
      if (!answers || typeof answers !== 'object' || Array.isArray(answers) || Object.keys(answers).some(key => !allowedFields.includes(key))) return json({ error: 'Invalid questionnaire answers.' }, 400);
      for (const key of textFields) if (key in answers && (typeof answers[key] !== 'string' || answers[key].length > 1000)) return json({ error: 'A written answer is too long.' }, 400);
      for (const [key, max] of Object.entries(numberLimits)) if (key in answers && (typeof answers[key] !== 'number' || !Number.isFinite(answers[key]) || answers[key] < 0 || answers[key] > max)) return json({ error: 'A number answer is outside the allowed range.' }, 400);
      if ('name_preference' in answers && !['allie', 'alexis', 'depends'].includes(answers.name_preference)) return json({ error: 'Choose Allie, Alexis, or depends.' }, 400);
      const { error: saveError } = await db.from('guest_questionnaires').upsert({ guest_id: guest.id, answers }, { onConflict: 'guest_id' });
      if (saveError) throw saveError;
      return json({ saved: true, questionnaire: answers });
    }
    if (action === 'outfit') {
      const ids = ['bear', 'cat', 'dog', 'snowman'];
      const accessories: Record<string, string> = { gingerbread: 'gingerbread', bow: 'bow', santa_hat: 'santa_hat', scarf: 'scarf', sparkle: 'gingerbread', hat: 'santa_hat' };
      const accessory = body.accessory == null ? null : accessories[body.accessory];
      if (!ids.includes(body.character_id)) return json({ error: `Invalid character selection: ${String(body.character_id)}.` }, 400);
      if (body.accessory != null && !accessory) return json({ error: `Invalid accessory selection: ${String(body.accessory)}.` }, 400);
      const { error: saveError } = await db.from('outfits').upsert({ guest_id: guest.id, character_id: body.character_id, accessory }, { onConflict: 'guest_id' });
      if (saveError) throw saveError;
      return json({ saved: true });
    }
    if (action === 'submit-drawing') {
      if (typeof body.game_id !== 'string' || typeof body.image_base64 !== 'string' || body.image_base64.length > 7_000_000 || typeof body.score !== 'number' || !Number.isInteger(body.score) || body.score < 0 || body.score > 100) return json({ error: 'Invalid drawing submission.' }, 400);
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
      const { data: submission, error: insertError } = await db.from('game_submissions').insert({ guest_id: guest.id, game_id: prompt.id, drawing_storage_path: path, score: body.score, scoring_version: 'client-ink-f1-r4-v1' }).select('id,score,created_at').single();
      if (insertError) { await db.storage.from('drawings').remove([path]); throw insertError; }
      return json({ submission, message: 'Drawing saved with its similarity score.' }, 201);
    }
    if (action === 'leaderboard') {
      const { data, error: leaderboardError } = await db.from('game_submissions').select('score,created_at,guests(name)').not('score', 'is', null).order('score', { ascending: false }).order('created_at', { ascending: true }).limit(10);
      if (leaderboardError) throw leaderboardError;
      return json({ leaderboard: data ?? [] });
    }
    return json({ error: 'Unknown action.' }, 400);
  } catch (e) { console.error(e); return json({ error: 'Request could not be completed.' }, 500); }
});

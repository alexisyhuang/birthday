import { createClient } from 'npm:@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') ?? 'null', 'Access-Control-Allow-Headers': 'authorization, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
async function digest(token: string) { const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)); return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join(''); }
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST' || req.headers.get('Authorization') !== `Bearer ${Deno.env.get('INVITE_ADMIN_SECRET')}`) return json({ error: 'Unauthorized.' }, 401);
  try {
    const { name } = await req.json();
    if (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 100) return json({ error: 'Valid guest name required.' }, 400);
    const token = [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join('');
    const secretKey = (JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>).default;
    if (!secretKey) throw new Error('Supabase default secret API key is unavailable.');
    const db = createClient(Deno.env.get('SUPABASE_URL')!, secretKey);
    const { error } = await db.from('guests').insert({ name: name.trim(), invitation_token_hash: await digest(token) });
    if (error) throw error;
    const origin = (Deno.env.get('APP_ORIGIN') ?? '').replace(/\/$/, '');
    return json({ name: name.trim(), token, path: `/?token=${token}`, url: origin ? `${origin}/?token=${token}` : null, warning: 'Store this link securely; the raw token cannot be retrieved later.' }, 201);
  } catch (e) { console.error(e); return json({ error: 'Invitation could not be created.' }, 500); }
});

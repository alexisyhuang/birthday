import { createClient } from 'npm:@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') ?? 'null', 'Access-Control-Allow-Headers': 'authorization, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
async function digest(token: string) { const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)); return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join(''); }
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST' || req.headers.get('Authorization') !== `Bearer ${Deno.env.get('INVITE_ADMIN_SECRET')}`) return json({ error: 'Unauthorized.' }, 401);
  try {
    const body = await req.json();
    const bulk = Array.isArray(body.names);
    const requestedNames: unknown[] = bulk ? body.names : [body.name];
    if (requestedNames.length < 1 || requestedNames.length > 100) return json({ error: 'Provide between 1 and 100 guest names.' }, 400);
    if (requestedNames.some(name => typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 100)) return json({ error: 'Every guest name must contain 1 to 100 characters.' }, 400);
    const names = requestedNames as string[];
    const invitations = await Promise.all(names.map(async name => {
      const token = [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join('');
      return { name: name.trim(), token, invitation_token_hash: await digest(token) };
    }));
    const secretKey = (JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>).default;
    if (!secretKey) throw new Error('Supabase default secret API key is unavailable.');
    const db = createClient(Deno.env.get('SUPABASE_URL')!, secretKey);
    const { error } = await db.from('guests').insert(invitations.map(({ name, invitation_token_hash }) => ({ name, invitation_token_hash })));
    if (error) throw error;
    const origin = (Deno.env.get('APP_ORIGIN') ?? '').replace(/\/$/, '');
    const created = invitations.map(({ name, token }) => ({ name, token, path: `/?token=${token}`, url: origin ? `${origin}/?token=${token}` : null }));
    const warning = 'Store these links securely; raw invitation tokens cannot be retrieved later.';
    return bulk ? json({ invitations: created, warning }, 201) : json({ ...created[0], warning }, 201);
  } catch (e) { console.error(e); return json({ error: 'Invitation could not be created.' }, 500); }
});

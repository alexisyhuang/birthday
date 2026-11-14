import { readFileSync } from 'node:fs';

const namesFile = process.argv[2] ?? 'guest-names.txt';
const names = readFileSync(namesFile, 'utf8').split(/\r?\n/).map(name => name.trim()).filter(Boolean);
const secret = process.env.INVITE_ADMIN_SECRET;

if (!secret) throw new Error('Set INVITE_ADMIN_SECRET in your terminal environment first.');
if (names.length < 1 || names.length > 100) throw new Error('Provide 1 to 100 names, one per line.');

const response = await fetch('https://znbyiipxxtrgmmahmhpr.supabase.co/functions/v1/admin-invite', {
  method: 'POST',
  headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ names }),
});
const result = await response.json();
if (!response.ok) throw new Error(result.error ?? `Invite request failed with HTTP ${response.status}.`);

for (const invitation of result.invitations ?? []) {
  console.log(`${invitation.name}\t${invitation.url ?? invitation.path}`);
}

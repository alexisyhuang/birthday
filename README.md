# Christmas Birthday Invitation

React + TypeScript + Vite prototype. Start with `npm install` then `npm run dev`.

## Current slice
Invitation envelope, opening animation, personalized greeting, invitation details, and a central hub with three prototype activities: dress-up, timed drawing/leaderboard, and editable RSVP. Add a name with `?guest=Alex`. Activity data is local to the browser for now; scores are demo values and not validated.

## Artwork
Placeholder emoji and CSS illustrations live in `src/data/assets.ts`; replace their values with supplied assets. Artwork folders are organized under `public/artwork/`; audio folders under `public/audio/`.

## Later decisions
Host: Allie. Date: Sunday, December 13, 2026. Time: 3–6 PM. Location: 20 West Street, NYC. Each invitation link represents one person and will be pasted into individual text messages. Backend design should use a guest token exchange endpoint and short-lived session credential; store a token hash, keep service-role credentials server-side, and enforce guest-scoped RLS. Consider separate `game_prompts`, `game_submissions` (private storage object key, score, scorer/version metadata), and public-safe leaderboard view instead of storing only a score. Store outfit accessory as structured JSON or normalized slots if multiple accessory anchors are supported. RSVP needs nullable status (`yes`/`no`/unanswered), plus guest-count/preferences only if required.

## Supabase backend (Phase 3)

### Local configuration

Copy `.env.example` to `.env.local` and set the project URL plus publishable key. Never put a Supabase secret key in a `VITE_` variable or commit it. Guests must open a generated `?token=...` invitation link to use cloud persistence; `?guest=...` continues to use browser-local demo mode.

### Deploy schema and functions

Install the Supabase CLI, authenticate it, and link this folder to project `znbyiipxxtrgmmahmhpr`:

```sh
npx supabase login
npx supabase link --project-ref znbyiipxxtrgmmahmhpr
npx supabase db push
npx supabase secrets set SUPABASE_SECRET_KEY='sb_secret_...' INVITE_ADMIN_SECRET='a-long-random-admin-secret' APP_ORIGIN='https://your-deployed-site.example'
npx supabase functions deploy guest-api --no-verify-jwt
npx supabase functions deploy admin-invite --no-verify-jwt
```

Use the project's **secret** API key for `SUPABASE_SECRET_KEY`. Keep it in Supabase Function secrets, never in this repository or browser. `APP_ORIGIN` should be the final app origin; set `http://localhost:5173` for local development if needed. The publishable key is safe for browser use and belongs in `.env.local` only for local convenience.

### Create individual invitation links

Call `admin-invite` from a trusted terminal, replacing the placeholder secret and guest name. Its response contains a one-time raw token. Save the returned link and send it privately to that guest; the database stores only the SHA-256 hash.

```sh
curl -X POST 'https://znbyiipxxtrgmmahmhpr.supabase.co/functions/v1/admin-invite' \\
  -H 'Authorization: Bearer YOUR_INVITE_ADMIN_SECRET' \\
  -H 'Content-Type: application/json' \\
  -d '{"name":"Guest Name"}'
```

### Current backend boundary

RSVP and outfit writes are guest-token verified and saved through Edge Functions. Drawing uploads are private and stored with a pending score. Scores remain unset until the scoring method is chosen and implemented server-side; the browser demo leaderboard is not used as a trusted ranking. The web app build does not compile the Deno Edge Functions, so use the Supabase CLI to validate/deploy those separately. The reference prompt row is seeded, but its illustration asset still needs to be uploaded before a reference-image UI is connected. Admin link creation is protected by `INVITE_ADMIN_SECRET` and must only be called from a trusted environment.

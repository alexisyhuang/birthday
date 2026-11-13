# Christmas Birthday Invitation

React + TypeScript + Vite prototype. Start with `npm install` then `npm run dev`.

## Current slice
Welcome cat → addressed envelope → personalized invitation letter, followed by a full-bleed illustrated hub and interactive activity artwork. The dress-up view layers each character and one accessory. Add `?guest=Alex` for local demo mode or a verified `?token=...` link for cloud mode. Drawing scores remain demo values until server scoring is implemented.

## Artwork
All supplied artwork is in the root `art/` folder. The central map at `src/data/assets.ts` points to the welcome cat, envelope, letter stationery, responsive hub backgrounds, clickable activity illustrations, and character bases. The original four-item accessory sheet is preserved; individually cropped transparent layers are in `art/accessory-parts/` for the dress-up UI. `full desktop.png` and `full phone.png` are visual layout references; the app layers separate artwork over the matching background so each activity remains independently clickable.

## Later decisions
Host: Allie. Date: Saturday, December 12, 2026. Time: 3–6 PM. Location: 20 West Street, NYC. Each invitation link represents one person and will be pasted into individual text messages. Backend design should use a guest token exchange endpoint and short-lived session credential; store a token hash, keep service-role credentials server-side, and enforce guest-scoped RLS. Consider separate `game_prompts`, `game_submissions` (private storage object key, score, scorer/version metadata), and public-safe leaderboard view instead of storing only a score. Store outfit accessory as structured JSON or normalized slots if multiple accessory anchors are supported. RSVP needs nullable status (`yes`/`no`/unanswered), plus guest-count/preferences only if required.

## Supabase backend (Phase 3)

### Local configuration

Copy `.env.example` to `.env.local` and set the project URL plus publishable key. Never put a Supabase secret key in a `VITE_` variable or commit it. Guests must open a generated `?token=...` invitation link to use cloud persistence; `?guest=...` continues to use browser-local demo mode.

### Deploy schema and functions

Install the Supabase CLI, authenticate it, and link this folder to project `znbyiipxxtrgmmahmhpr`:

```sh
npx supabase login
npx supabase link --project-ref znbyiipxxtrgmmahmhpr
npx supabase db push
npx supabase secrets set INVITE_ADMIN_SECRET='a-long-random-admin-secret' APP_ORIGIN='https://your-deployed-site.example'
npx supabase functions deploy guest-api --no-verify-jwt
npx supabase functions deploy admin-invite --no-verify-jwt
```

Supabase automatically provides the default secret key through `SUPABASE_SECRET_KEYS`; the functions read its `default` entry. Do not try to add a custom `SUPABASE_*` secret. Only `INVITE_ADMIN_SECRET` and `APP_ORIGIN` are custom secrets. `APP_ORIGIN` should be the final app origin; set `http://localhost:5173` for local development if needed. The publishable key is safe for browser use and belongs in `.env.local` only for local convenience.

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

### Artwork schema update

The supplied accessory set uses `gingerbread`, `bow`, `santa_hat`, and `scarf`. After applying the earlier schema migration, apply the new migration with `npx supabase db push`, then redeploy `guest-api` so its accessory validation accepts the new IDs.

# Allie’s 25th Birthday

React + TypeScript + Vite prototype. Start with `npm install` then `npm run dev`.

## Current slice
Welcome cat → addressed envelope → personalized invitation letter, followed by a full-bleed illustrated hub and interactive activity artwork. The dress-up view layers each character and one accessory. Add `?guest=Alex` for local demo mode or a verified `?token=...` link for cloud mode. Drawing scores remain demo values until server scoring is implemented.

## Artwork
All supplied artwork is in the root `art/` folder. The central map at `src/data/assets.ts` points to the welcome cat, envelope, letter stationery, responsive hub backgrounds, clickable activity illustrations, and character bases. The original four-item accessory sheet is preserved; individually cropped transparent layers are in `art/accessory-parts/` for the dress-up UI. `full desktop.png` and `full phone.png` are visual layout references; the app layers separate artwork over the matching background so each activity remains independently clickable.

## Later decisions
Host: Allie. Date: Saturday, December 12, 2026. Time: 2–5 PM. Location: 20 West Street, NYC. Each invitation link represents one person and will be pasted into individual text messages. Backend design should use a guest token exchange endpoint and short-lived session credential; store a token hash, keep service-role credentials server-side, and enforce guest-scoped RLS. Consider separate `game_prompts`, `game_submissions` (private storage object key, score, scorer/version metadata), and public-safe leaderboard view instead of storing only a score. Store outfit accessory as structured JSON or normalized slots if multiple accessory anchors are supported. RSVP needs nullable status (`yes`/`no`/unanswered), plus guest-count/preferences only if required.

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

RSVP, outfits, and optional Santa questionnaire answers are guest-token verified and saved through Edge Functions. Questionnaire answers are stored in the per-guest `guest_questionnaires` table as validated JSONB; the invitation token is never exposed to ordinary database access. Drawing uploads are private and saved with their score metadata. The web app build does not compile the Deno Edge Functions, so use the Supabase CLI to deploy them separately. Admin link creation is protected by `INVITE_ADMIN_SECRET` and must only be called from a trusted environment.

### Artwork schema update

The supplied accessory set uses `gingerbread`, `bow`, `santa_hat`, and `scarf`. After applying the earlier schema migration, apply the new migration with `npx supabase db push`, then redeploy `guest-api` so its accessory validation accepts the new IDs.


### Santa questionnaire update

Apply the guest questionnaire migration and redeploy the guest API before using questionnaire cloud saving:

```sh
npx supabase db push
npx supabase functions deploy guest-api --no-verify-jwt
```

All questionnaire fields are optional. Submitting saves the current answers for that invitation and can be repeated as the guest adds or edits answers.

### View and export questionnaire answers

In the Supabase Dashboard, open **SQL Editor**, create a query, and run this to see each respondent alongside their name and RSVP:

```sql
select
  g.name as guest_name,
  g.rsvp_status,
  q.answers ->> 'annoying_song' as annoying_christmas_song,
  q.answers ->> 'holiday_movie' as favorite_holiday_movie,
  q.answers ->> 'favorite_dessert' as favorite_dessert,
  q.answers ->> 'regift_item' as re_gift_item,
  q.answers ->> 'christmas_association' as christmas_association,
  q.answers ->> 'overrated_restaurant' as overrated_restaurant,
  q.answers ->> 'party_excuse' as holiday_party_excuse,
  q.answers ->> 'allie_association' as allie_association,
  q.answers ->> 'weekday_job_hours' as weekday_job_hours,
  q.answers ->> 'unread_emails' as unread_emails,
  q.answers ->> 'unread_texts' as unread_texts,
  q.answers ->> 'allie_spiritual_age' as allie_spiritual_age,
  q.answers ->> 'name_preference' as allie_or_alexis,
  q.updated_at as last_answer_update
from public.guest_questionnaires q
join public.guests g on g.id = q.guest_id
order by g.name;
```

This returns guests who have submitted the questionnaire. To include invited guests who have not answered yet, change `join` to `left join` and start the query with `from public.guests g left join public.guest_questionnaires q on q.guest_id = g.id`. Only run this from the project dashboard or another trusted admin connection; guest access stays behind the invitation-token Edge Function. You can copy or export the SQL results from the dashboard for use in the trivia game.

### View RSVP responses

Run this in the Supabase Dashboard SQL Editor to list all invitees and their response (`yes`, `no`, or `null` if they have not replied):

```sql
select name, rsvp_status
from public.guests
order by name;
```

To show only attendees who replied yes, add `where rsvp_status = 'yes'` before `order by`. This is an admin query; keep it in the Supabase Dashboard or another trusted admin connection.

### Vercel launch checklist

1. Push the latest project files to the GitHub repository connected to Vercel. Vercel should detect Vite, run `npm run build`, and publish the `dist` directory. The build copies the configured artwork into `dist/art` and creates the native mouse cursor asset.
2. In Vercel project settings, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for Production. These are the only Supabase values the browser needs. Do not add the Supabase secret or `INVITE_ADMIN_SECRET` to Vercel.
3. Before launch, run `npx supabase db push` and deploy both Edge Functions: `npx supabase functions deploy guest-api --no-verify-jwt` and `npx supabase functions deploy admin-invite --no-verify-jwt`. Set Supabase's `APP_ORIGIN` secret to the exact production URL (including `https://` and any custom domain) so CORS and generated invitation URLs use the live site.
4. Create a test invite from the production site, open it on desktop and mobile, and check RSVP updates, outfit saves, drawing submissions, questionnaire saves, and the RSVP/query above.
5. Music is optional; the current `public/audio/music` folder has no track yet. Add `christmas-party.mp3` there if you want the sound toggle to play music.

The drawing score is still calculated in the browser and submitted with the drawing. That is fine for a casual party leaderboard, but guests could manipulate scores; use server-side scoring before relying on it for a competitive or prize-based ranking.

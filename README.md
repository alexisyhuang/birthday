# Christmas Birthday Invitation

React + TypeScript + Vite prototype. Start with `npm install` then `npm run dev`.

## Current slice
Invitation envelope, opening animation, personalized greeting, invitation details, and a central hub shell. Add a name with `?guest=Alex`. The three hub cards are visual placeholders for later activity phases.

## Artwork
Placeholder emoji and CSS illustrations live in `src/data/assets.ts`; replace their values with supplied assets. Artwork folders are organized under `public/artwork/`; audio folders under `public/audio/`.

## Later decisions
Host: Allie. Date: Sunday, December 13, 2026. Time: 3–6 PM. Location is still to be provided. Each invitation link represents one person and will be pasted into individual text messages. Backend design should use a guest token exchange endpoint and short-lived session credential; store a token hash, keep service-role credentials server-side, and enforce guest-scoped RLS. Consider separate `game_prompts`, `game_submissions` (private storage object key, score, scorer/version metadata), and public-safe leaderboard view instead of storing only a score. Store outfit accessory as structured JSON or normalized slots if multiple accessory anchors are supported. RSVP needs nullable status (`yes`/`no`/unanswered), plus guest-count/preferences only if required.

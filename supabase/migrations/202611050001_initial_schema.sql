create extension if not exists pgcrypto;

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 100),
  invitation_token_hash text not null unique check (invitation_token_hash ~ '^[a-f0-9]{64}$'),
  rsvp_status text check (rsvp_status in ('yes', 'no')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.outfits (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null unique references public.guests(id) on delete cascade,
  character_id text not null check (character_id in ('bear', 'cat', 'dog', 'snowman')),
  accessory text check (accessory in ('bow', 'hat', 'scarf', 'sparkle')),
  updated_at timestamptz not null default now()
);

create table public.game_prompts (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  reference_storage_path text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.game_submissions (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests(id) on delete cascade,
  game_id uuid not null references public.game_prompts(id),
  drawing_storage_path text not null unique,
  score integer check (score between 0 and 100),
  scoring_version text,
  created_at timestamptz not null default now(),
  check ((score is null and scoring_version is null) or (score is not null and scoring_version is not null))
);
create index game_submissions_leaderboard_idx on public.game_submissions(score desc, created_at asc) where score is not null;
create index game_submissions_guest_idx on public.game_submissions(guest_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger guests_set_updated_at before update on public.guests for each row execute function public.set_updated_at();
create trigger outfits_set_updated_at before update on public.outfits for each row execute function public.set_updated_at();

alter table public.guests enable row level security;
alter table public.outfits enable row level security;
alter table public.game_prompts enable row level security;
alter table public.game_submissions enable row level security;
-- Guests access data only through Edge Functions after invitation-token verification.
revoke all on public.guests, public.outfits, public.game_prompts, public.game_submissions from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('drawings', 'drawings', false, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

insert into public.game_prompts (id, prompt, reference_storage_path) values ('11111111-1111-4111-8111-111111111111', 'A little Christmas tree', 'reference/christmas-tree.png') on conflict (id) do nothing;

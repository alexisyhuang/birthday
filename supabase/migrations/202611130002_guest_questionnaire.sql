create table public.guest_questionnaires (
  guest_id uuid primary key references public.guests(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  updated_at timestamptz not null default now()
);

create trigger guest_questionnaires_set_updated_at
  before update on public.guest_questionnaires
  for each row execute function public.set_updated_at();

alter table public.guest_questionnaires enable row level security;
revoke all on public.guest_questionnaires from anon, authenticated;

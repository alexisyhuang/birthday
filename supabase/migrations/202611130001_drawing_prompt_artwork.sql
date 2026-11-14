-- Register the four supplied line-art challenges with the existing game API.
update public.game_prompts
set prompt = 'Pusheen wreath',
    reference_storage_path = 'reference/pusheen-wreath.png',
    active = true
where id = '11111111-1111-4111-8111-111111111111';

insert into public.game_prompts (id, prompt, reference_storage_path, active) values
  ('22222222-2222-4222-8222-222222222222', 'Bear with a tree', 'reference/bear-with-tree.webp', true),
  ('33333333-3333-4333-8333-333333333333', 'Hello Kitty gingerbread', 'reference/hello-kitty-gingerbread.png', true),
  ('44444444-4444-4444-8444-444444444444', 'Pusheen in winter', 'reference/pusheen-winter.jpg', true)
on conflict (id) do update set
  prompt = excluded.prompt,
  reference_storage_path = excluded.reference_storage_path,
  active = excluded.active;

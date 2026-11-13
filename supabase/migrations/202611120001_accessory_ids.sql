-- Align stored accessory identifiers with Allie's supplied artwork.
update public.outfits set accessory = null where accessory = 'sparkle';
update public.outfits set accessory = 'santa_hat' where accessory = 'hat';
alter table public.outfits drop constraint if exists outfits_accessory_check;
alter table public.outfits add constraint outfits_accessory_check
  check (accessory in ('gingerbread', 'bow', 'santa_hat', 'scarf'));

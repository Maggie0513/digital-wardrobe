create extension if not exists "pgcrypto";

create table if not exists public.clothes (
  id uuid primary key,
  name text not null,
  category text not null,
  color text not null,
  note text,
  image_url text not null,
  created_at timestamp with time zone not null default now()
);

alter table public.clothes enable row level security;

drop policy if exists "Allow public read clothes" on public.clothes;
create policy "Allow public read clothes"
on public.clothes
for select
to anon
using (true);

drop policy if exists "Allow public insert clothes" on public.clothes;
create policy "Allow public insert clothes"
on public.clothes
for insert
to anon
with check (true);

drop policy if exists "Allow public delete clothes" on public.clothes;
create policy "Allow public delete clothes"
on public.clothes
for delete
to anon
using (true);

insert into storage.buckets (id, name, public)
values ('clothes-images', 'clothes-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Allow public read clothes images" on storage.objects;
create policy "Allow public read clothes images"
on storage.objects
for select
to public
using (bucket_id = 'clothes-images');

drop policy if exists "Allow public upload clothes images" on storage.objects;
create policy "Allow public upload clothes images"
on storage.objects
for insert
to public
with check (bucket_id = 'clothes-images');

drop policy if exists "Allow public update clothes images" on storage.objects;
create policy "Allow public update clothes images"
on storage.objects
for update
to public
using (bucket_id = 'clothes-images')
with check (bucket_id = 'clothes-images');

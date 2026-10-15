-- iCook: einmal im Supabase-Dashboard unter "SQL Editor" einfügen und mit "Run" ausführen.
-- Legt die Tabellen, die Zugriffsregeln, den Fotospeicher und die Live-Updates an.
-- Zugriff: ALLE dürfen ohne Anmeldung lesen, anlegen, ändern und löschen.

-- ---------- Tabellen (jede Zeile enthält das komplette Objekt als JSON) ----------
create table if not exists public.recipes (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key,
  data jsonb not null,
  position integer not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------- Zugriffsregeln ----------
alter table public.recipes enable row level security;
alter table public.categories enable row level security;

drop policy if exists "icook recipes: alle lesen" on public.recipes;
drop policy if exists "icook recipes: alle anlegen" on public.recipes;
drop policy if exists "icook recipes: alle ändern" on public.recipes;
drop policy if exists "icook recipes: alle löschen" on public.recipes;
create policy "icook recipes: alle lesen"   on public.recipes for select to anon, authenticated using (true);
create policy "icook recipes: alle anlegen" on public.recipes for insert to anon, authenticated with check (true);
create policy "icook recipes: alle ändern"  on public.recipes for update to anon, authenticated using (true) with check (true);
create policy "icook recipes: alle löschen" on public.recipes for delete to anon, authenticated using (true);

drop policy if exists "icook categories: alle lesen" on public.categories;
drop policy if exists "icook categories: alle anlegen" on public.categories;
drop policy if exists "icook categories: alle ändern" on public.categories;
drop policy if exists "icook categories: alle löschen" on public.categories;
create policy "icook categories: alle lesen"   on public.categories for select to anon, authenticated using (true);
create policy "icook categories: alle anlegen" on public.categories for insert to anon, authenticated with check (true);
create policy "icook categories: alle ändern"  on public.categories for update to anon, authenticated using (true) with check (true);
create policy "icook categories: alle löschen" on public.categories for delete to anon, authenticated using (true);

-- ---------- Fotospeicher (öffentlich lesbar, alle dürfen hochladen) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-images', 'recipe-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "icook images: alle lesen" on storage.objects;
drop policy if exists "icook images: alle hochladen" on storage.objects;
create policy "icook images: alle lesen"     on storage.objects for select to anon, authenticated using (bucket_id = 'recipe-images');
create policy "icook images: alle hochladen" on storage.objects for insert to anon, authenticated with check (bucket_id = 'recipe-images');

-- ---------- Live-Updates: Änderungen anderer erscheinen ohne Neuladen ----------
do $$
begin
  alter publication supabase_realtime add table public.recipes;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.categories;
exception when duplicate_object then null;
end $$;

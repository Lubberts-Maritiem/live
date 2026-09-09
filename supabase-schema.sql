-- wadoversteken.nl — database-schema voor accounts & favorieten (Supabase)
--
-- Uitvoeren: Supabase-dashboard > SQL Editor > New query > plak dit bestand
-- in zijn geheel > Run. Eenmalig nodig, per Supabase-project.
--
-- Account aanmaken/inloggen zit al kant-en-klaar in Supabase (auth.users);
-- daar hoeft niets voor gemaakt te worden. Deze tabel is alleen voor de
-- favorieten die gebruikers opslaan.

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  route_id text not null,
  van text not null,
  naar text not null,
  advies text,
  referentiepunt text,
  event_type text,
  vertrek timestamptz not null,
  vertrek_eind timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, route_id, vertrek)
);

alter table public.favorites enable row level security;

-- Een gebruiker mag alleen zijn eigen favorieten zien, aanmaken en
-- verwijderen. Zonder deze regels zou iedereen met de (publieke) anon-key
-- bij elkaars favorieten kunnen, dus dit is niet optioneel.

create policy "Favorieten zijn zichtbaar voor de eigenaar"
  on public.favorites for select
  using (auth.uid() = user_id);

create policy "Favorieten zijn aan te maken door de eigenaar"
  on public.favorites for insert
  with check (auth.uid() = user_id);

create policy "Favorieten zijn te verwijderen door de eigenaar"
  on public.favorites for delete
  using (auth.uid() = user_id);

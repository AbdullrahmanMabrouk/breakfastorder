-- Lunch Board database setup for Supabase
-- Run this once in Supabase > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.food_orders (
  order_date date not null,
  member_id uuid not null references public.team_members(id) on delete cascade,
  member_name text not null,
  ordering boolean not null default false,
  meal text not null default '',
  note text not null default '',
  updated_at timestamptz not null default now(),
  primary key (order_date, member_id)
);

alter table public.team_members enable row level security;
alter table public.food_orders enable row level security;

-- This app is designed for a trusted internal team.
-- Anyone with the app's URL can read/write the team board.
-- Do not use this setup for sensitive information.

drop policy if exists "team members are readable" on public.team_members;
drop policy if exists "team members can be added" on public.team_members;
drop policy if exists "team members can be removed" on public.team_members;

create policy "team members are readable"
on public.team_members for select
to anon, authenticated
using (true);

create policy "team members can be added"
on public.team_members for insert
to anon, authenticated
with check (char_length(trim(name)) between 1 and 60);

create policy "team members can be removed"
on public.team_members for delete
to anon, authenticated
using (true);

drop policy if exists "food orders are readable" on public.food_orders;
drop policy if exists "food orders can be written" on public.food_orders;

create policy "food orders are readable"
on public.food_orders for select
to anon, authenticated
using (true);

create policy "food orders can be written"
on public.food_orders for insert
to anon, authenticated
with check (
  exists (select 1 from public.team_members m where m.id = member_id and m.active = true and m.name = member_name)
  and char_length(meal) <= 160
  and char_length(note) <= 160
);

create policy "food orders can be updated"
on public.food_orders for update
to anon, authenticated
using (true)
with check (
  exists (select 1 from public.team_members m where m.id = member_id and m.active = true and m.name = member_name)
  and char_length(meal) <= 160
  and char_length(note) <= 160
);

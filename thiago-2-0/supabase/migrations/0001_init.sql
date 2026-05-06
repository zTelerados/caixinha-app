-- Thiago 2.0 — schema inicial
-- Rode no SQL Editor do Supabase OU via supabase db push

create extension if not exists pgcrypto;

------------------------------------------------------------
-- profile do usuário
------------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  start_date date default current_date,
  current_weight numeric default 91,
  current_hba1c numeric default 11.0,
  total_xp integer default 0,
  streak integer default 0,
  last_streak_date date,
  push_subscription jsonb,
  created_at timestamptz default now()
);

------------------------------------------------------------
-- log diário de quests
------------------------------------------------------------
create table if not exists public.daily_quests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  quest_id text not null,
  completed_at timestamptz default now(),
  unique(user_id, date, quest_id)
);
create index if not exists idx_daily_quests_user_date on public.daily_quests(user_id, date);

------------------------------------------------------------
-- glicemia
------------------------------------------------------------
create table if not exists public.glucose_readings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  value integer not null check (value >= 20 and value <= 700),
  context text not null,
  reading_date date not null,
  reading_time time not null,
  created_at timestamptz default now()
);
create index if not exists idx_glucose_user_date on public.glucose_readings(user_id, reading_date desc);

------------------------------------------------------------
-- peso
------------------------------------------------------------
create table if not exists public.weight_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  weight numeric not null check (weight > 20 and weight < 300),
  date date not null,
  unique(user_id, date)
);
create index if not exists idx_weight_user_date on public.weight_log(user_id, date desc);

------------------------------------------------------------
-- conquistas
------------------------------------------------------------
create table if not exists public.achievements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  milestone_id text not null,
  achieved_at timestamptz default now(),
  unique(user_id, milestone_id)
);

------------------------------------------------------------
-- lembretes
------------------------------------------------------------
create table if not exists public.reminders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  reminder_type text not null,
  hour integer not null check (hour >= 0 and hour <= 23),
  minute integer not null check (minute >= 0 and minute <= 59),
  enabled boolean default true,
  unique(user_id, reminder_type)
);
create index if not exists idx_reminders_enabled on public.reminders(enabled, hour, minute);

------------------------------------------------------------
-- RLS
------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.daily_quests     enable row level security;
alter table public.glucose_readings enable row level security;
alter table public.weight_log       enable row level security;
alter table public.achievements     enable row level security;
alter table public.reminders        enable row level security;

drop policy if exists "users see own profile"  on public.profiles;
drop policy if exists "users see own quests"   on public.daily_quests;
drop policy if exists "users see own glucose"  on public.glucose_readings;
drop policy if exists "users see own weight"   on public.weight_log;
drop policy if exists "users see own achievements" on public.achievements;
drop policy if exists "users see own reminders" on public.reminders;

create policy "users see own profile"  on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "users see own quests"   on public.daily_quests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users see own glucose"  on public.glucose_readings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users see own weight"   on public.weight_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users see own achievements" on public.achievements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users see own reminders" on public.reminders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

------------------------------------------------------------
-- trigger criando profile no signup
------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', null))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

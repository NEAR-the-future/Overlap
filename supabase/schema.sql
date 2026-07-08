create extension if not exists pgcrypto;

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.availability_slots (
  participant_id uuid not null references public.participants(id) on delete cascade,
  slot_key text not null,
  created_at timestamptz not null default now(),
  primary key (participant_id, slot_key)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  primary key (project_id, participant_id)
);

alter table public.participants enable row level security;
alter table public.availability_slots enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;

drop policy if exists "Prototype read participants" on public.participants;
drop policy if exists "Prototype insert participants" on public.participants;
drop policy if exists "Prototype update participants" on public.participants;
drop policy if exists "Prototype delete participants" on public.participants;

drop policy if exists "Prototype read slots" on public.availability_slots;
drop policy if exists "Prototype insert slots" on public.availability_slots;
drop policy if exists "Prototype update slots" on public.availability_slots;
drop policy if exists "Prototype delete slots" on public.availability_slots;

drop policy if exists "Prototype read projects" on public.projects;
drop policy if exists "Prototype insert projects" on public.projects;
drop policy if exists "Prototype update projects" on public.projects;
drop policy if exists "Prototype delete projects" on public.projects;

drop policy if exists "Prototype read project members" on public.project_members;
drop policy if exists "Prototype insert project members" on public.project_members;
drop policy if exists "Prototype update project members" on public.project_members;
drop policy if exists "Prototype delete project members" on public.project_members;

create policy "Prototype read participants"
  on public.participants for select
  to anon, authenticated
  using (true);

create policy "Prototype insert participants"
  on public.participants for insert
  to anon, authenticated
  with check (true);

create policy "Prototype update participants"
  on public.participants for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "Prototype delete participants"
  on public.participants for delete
  to anon, authenticated
  using (true);

create policy "Prototype read slots"
  on public.availability_slots for select
  to anon, authenticated
  using (true);

create policy "Prototype insert slots"
  on public.availability_slots for insert
  to anon, authenticated
  with check (true);

create policy "Prototype update slots"
  on public.availability_slots for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "Prototype delete slots"
  on public.availability_slots for delete
  to anon, authenticated
  using (true);

create policy "Prototype read projects"
  on public.projects for select
  to anon, authenticated
  using (true);

create policy "Prototype insert projects"
  on public.projects for insert
  to anon, authenticated
  with check (true);

create policy "Prototype update projects"
  on public.projects for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "Prototype delete projects"
  on public.projects for delete
  to anon, authenticated
  using (true);

create policy "Prototype read project members"
  on public.project_members for select
  to anon, authenticated
  using (true);

create policy "Prototype insert project members"
  on public.project_members for insert
  to anon, authenticated
  with check (true);

create policy "Prototype update project members"
  on public.project_members for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "Prototype delete project members"
  on public.project_members for delete
  to anon, authenticated
  using (true);

create index if not exists availability_slots_slot_key_idx
  on public.availability_slots(slot_key);

create index if not exists project_members_participant_id_idx
  on public.project_members(participant_id);

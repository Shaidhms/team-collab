-- Warmup schema: a single shared task board.
-- No auth; the anon role is granted CRUD via permissive RLS.
-- When auth is added later, swap these policies for user/workspace-scoped ones.

create extension if not exists pgcrypto;

create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  text        text not null check (length(text) between 1 and 280),
  done        boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index tasks_created_at_idx on public.tasks (created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;

create policy "anon read tasks"   on public.tasks for select using (true);
create policy "anon insert tasks" on public.tasks for insert with check (true);
create policy "anon update tasks" on public.tasks for update using (true) with check (true);
create policy "anon delete tasks" on public.tasks for delete using (true);

-- Enable realtime broadcast of changes
alter publication supabase_realtime add table public.tasks;

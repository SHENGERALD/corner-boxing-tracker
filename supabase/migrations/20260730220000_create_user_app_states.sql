create table if not exists public.user_app_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.user_app_states enable row level security;

revoke all on table public.user_app_states from anon;
grant select, insert, update, delete on table public.user_app_states to authenticated;

drop policy if exists "Users can read their own app state" on public.user_app_states;
create policy "Users can read their own app state"
on public.user_app_states for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can insert their own app state" on public.user_app_states;
create policy "Users can insert their own app state"
on public.user_app_states for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can update their own app state" on public.user_app_states;
create policy "Users can update their own app state"
on public.user_app_states for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can delete their own app state" on public.user_app_states;
create policy "Users can delete their own app state"
on public.user_app_states for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

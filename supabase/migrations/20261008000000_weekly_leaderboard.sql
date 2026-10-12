create table if not exists public.leaderboard_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (
    display_name = btrim(display_name)
    and char_length(display_name) between 2 and 20
    and display_name !~ '[[:cntrl:]]'
  ),
  opt_in boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.leaderboard_profiles enable row level security;
revoke all on table public.leaderboard_profiles from anon;
grant select, insert, update, delete on table public.leaderboard_profiles to authenticated;

create policy "Users can read their own leaderboard profile"
on public.leaderboard_profiles for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own leaderboard profile"
on public.leaderboard_profiles for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own leaderboard profile"
on public.leaderboard_profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own leaderboard profile"
on public.leaderboard_profiles for delete to authenticated
using ((select auth.uid()) = user_id);

-- One completed item counts once per day, regardless of sets or duration.
create function public.leaderboard_completed_items(p_record jsonb)
returns integer
language sql immutable
set search_path = ''
as $$
  select count(distinct item_id)::integer
  from (
    select jsonb_array_elements_text(
      case when jsonb_typeof(p_record->'completedItemIds') = 'array'
        then p_record->'completedItemIds' else '[]'::jsonb end
    ) as item_id
    union all
    select item->>'id' as item_id
    from jsonb_array_elements(
      case when jsonb_typeof(p_record->'customItems') = 'array'
        then p_record->'customItems' else '[]'::jsonb end
    ) as item
    where item->>'completed' = 'true'
    union all
    select logs.key as item_id
    from jsonb_each(
      case when jsonb_typeof(p_record->'itemSetLogs') = 'object'
        then p_record->'itemSetLogs' else '{}'::jsonb end
    ) as logs
    where jsonb_typeof(logs.value) = 'array'
      and exists (
        select 1 from jsonb_array_elements(
          case when jsonb_typeof(logs.value) = 'array'
            then logs.value else '[]'::jsonb end
        ) as training_set
        where training_set->>'completed' = 'true'
      )
  ) as completed
  where item_id is not null and item_id <> ''
    and item_id not in (
      select jsonb_array_elements_text(
        case when jsonb_typeof(p_record->'removedItemIds') = 'array'
          then p_record->'removedItemIds' else '[]'::jsonb end
      )
    );
$$;

revoke all on function public.leaderboard_completed_items(jsonb) from public, anon;

-- Only this RPC may read other users' training blobs. It returns aggregate points,
-- never the underlying record, and only for users who opted in.
create function public.get_weekly_leaderboard()
returns table (
  week_start date,
  "position" bigint,
  display_name text,
  points integer,
  training_days integer,
  is_me boolean
)
language plpgsql security definer
set search_path = ''
as $$
declare
  current_week date := date_trunc('week', now() at time zone 'UTC')::date;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  return query
  with activity as (
    select profile.user_id, day.key as date_key,
      public.leaderboard_completed_items(day.value) as completed_items
    from public.leaderboard_profiles as profile
    join public.user_app_states as app on app.user_id = profile.user_id
    cross join lateral jsonb_each(
      case when jsonb_typeof(app.state->'records') = 'object'
        then app.state->'records' else '{}'::jsonb end
    ) as day(key, value)
    where profile.opt_in
      and day.key between current_week::text and (current_week + 6)::text
      and day.key ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  ), scores as (
    select activity.user_id,
      count(*) filter (where completed_items > 0)::integer as training_days,
      coalesce(sum(case when completed_items > 0
        then 20 + 5 * least(completed_items, 5) else 0 end), 0)::integer as points
    from activity
    group by activity.user_id
  ), ranked as (
    select profile.user_id, profile.display_name,
      coalesce(scores.points, 0) as points,
      coalesce(scores.training_days, 0) as training_days,
      dense_rank() over (
        order by coalesce(scores.points, 0) desc,
          coalesce(scores.training_days, 0) desc
      ) as position,
      row_number() over (
        order by coalesce(scores.points, 0) desc,
          coalesce(scores.training_days, 0) desc,
          profile.display_name, profile.user_id
      ) as ordinal
    from public.leaderboard_profiles as profile
    left join scores on scores.user_id = profile.user_id
    where profile.opt_in
  )
  select current_week, ranked.position, ranked.display_name,
    ranked.points, ranked.training_days, ranked.user_id = auth.uid()
  from ranked
  where ranked.ordinal <= 50 or ranked.user_id = auth.uid()
  order by ranked.ordinal;
end;
$$;

revoke all on function public.get_weekly_leaderboard() from public, anon;
grant execute on function public.get_weekly_leaderboard() to authenticated;

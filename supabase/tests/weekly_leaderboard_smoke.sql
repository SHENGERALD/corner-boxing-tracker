-- Run after the leaderboard migration. All test identities and data roll back.
begin;
insert into auth.users (id) values
  ('cc000000-0000-4000-8000-000000000001'),
  ('cc000000-0000-4000-8000-000000000002');
insert into public.user_app_states (user_id, state)
select id, jsonb_build_object('records', jsonb_build_object(
  (now() at time zone 'UTC')::date::text,
  jsonb_build_object('completedItemIds', jsonb_build_array('smoke-test'))))
from auth.users where id in (
  'cc000000-0000-4000-8000-000000000001',
  'cc000000-0000-4000-8000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'cc000000-0000-4000-8000-000000000001', true);
insert into public.leaderboard_profiles (user_id, display_name, opt_in)
values (auth.uid(), 'Corner test A', true);
do $$ begin
  if not exists (select 1 from public.get_weekly_leaderboard() where is_me and points = 25 and training_days = 1)
  then raise exception 'A scoring failed'; end if;
end $$;

select set_config('request.jwt.claim.sub', 'cc000000-0000-4000-8000-000000000002', true);
insert into public.leaderboard_profiles (user_id, display_name, opt_in)
values (auth.uid(), 'Corner test B', true);
do $$ begin
  if (select count(*) from public.leaderboard_profiles) <> 1
  then raise exception 'Profile isolation failed'; end if;
  if not exists (select 1 from public.get_weekly_leaderboard() where is_me and points = 25)
  then raise exception 'B scoring failed'; end if;
end $$;
update public.user_app_states set state = jsonb_build_object('records', jsonb_build_object(
  (now() at time zone 'UTC')::date::text,
  jsonb_build_object('completedItemIds', jsonb_build_array('smoke-test', 'second'))))
where user_id = auth.uid();
do $$ begin
  if not exists (select 1 from public.get_weekly_leaderboard() where is_me and points = 30)
  then raise exception 'Score refresh failed'; end if;
end $$;
update public.leaderboard_profiles set opt_in = false where user_id = auth.uid();
do $$ begin
  if exists (select 1 from public.get_weekly_leaderboard() where is_me)
  then raise exception 'Opt-out failed'; end if;
end $$;
select set_config('request.jwt.claim.sub', 'cc000000-0000-4000-8000-000000000001', true);
do $$ begin
  if exists (select 1 from public.get_weekly_leaderboard() where display_name = 'Corner test B')
  then raise exception 'B is still public after opt-out'; end if;
end $$;
rollback;
select 'PASS: two isolated identities, participation, scoring, refresh, opt-out; test data rolled back' as result;

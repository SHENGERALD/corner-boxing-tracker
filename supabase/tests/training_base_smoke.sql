-- SQL Editor smoke test. All fixtures and game commands are rolled back.
begin;
reset role;
insert into auth.users(id) values
 ('dd000000-0000-4000-8000-000000000001'),
 ('dd000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','dd000000-0000-4000-8000-000000000002',true);
select public.base_command('profile','dd000000-0000-4000-8000-000000000010','{"name":"Base test B","opt_in":true}');
select set_config('request.jwt.claim.sub','dd000000-0000-4000-8000-000000000001',true);
select public.base_command('profile','dd000000-0000-4000-8000-000000000011','{"name":"Base test A","opt_in":true}');
insert into public.user_app_states(user_id,state) values(auth.uid(),jsonb_build_object('records',jsonb_build_object((now() at time zone 'UTC')::date::text,jsonb_build_object('completedItemIds',jsonb_build_array('test')))));
select public.base_command('claim','dd000000-0000-4000-8000-000000000012');
select public.base_command('claim','dd000000-0000-4000-8000-000000000013');
do $$ begin
 if (public.get_base_dashboard()->'player'->>'credits')::int <> 550 then raise exception 'Daily reward duplicated'; end if;
 if (select count(*) from public.base_players) <> 1 then raise exception 'Player isolation failed'; end if;
end $$;
select public.base_command('raid','dd000000-0000-4000-8000-000000000014','{"target":"dd000000-0000-4000-8000-000000000002","squad":[2,2,0]}');
select public.base_command('raid','dd000000-0000-4000-8000-000000000014','{"target":"dd000000-0000-4000-8000-000000000002","squad":[2,2,0]}');
do $$ begin
 if (public.get_base_dashboard()->'player'->>'energy')::int <> 4 then raise exception 'Raid charged twice'; end if;
 if (public.get_base_dashboard()->'player'->>'trophies')::int <> 15 then raise exception 'Raid rewards invalid'; end if;
end $$;
select public.base_command('friend_request','dd000000-0000-4000-8000-000000000015','{"target":"dd000000-0000-4000-8000-000000000002"}');
do $$ begin
 if exists(select 1 from public.get_base_opponents('',0,true) where user_id='dd000000-0000-4000-8000-000000000002') then raise exception 'Unaccepted friend exposed'; end if;
end $$;
select set_config('request.jwt.claim.sub','dd000000-0000-4000-8000-000000000002',true);
select public.base_command('friend_accept','dd000000-0000-4000-8000-000000000016','{"target":"dd000000-0000-4000-8000-000000000001"}');
do $$ begin
 if not exists(select 1 from public.get_base_opponents('',0,true) where user_id='dd000000-0000-4000-8000-000000000001') then raise exception 'Accepted friend missing'; end if;
 if (public.get_base_dashboard()->'player'->>'credits')::int <> 400 then raise exception 'Defender assets changed'; end if;
end $$;
select public.base_command('profile','dd000000-0000-4000-8000-000000000017','{"name":"Base test B","opt_in":false}');
select set_config('request.jwt.claim.sub','dd000000-0000-4000-8000-000000000001',true);
do $$ begin
 if exists(select 1 from public.get_base_opponents() where user_id='dd000000-0000-4000-8000-000000000002') then raise exception 'Opt-out failed'; end if;
end $$;
rollback;
reset role;
select not exists(select 1 from auth.users where id in ('dd000000-0000-4000-8000-000000000001','dd000000-0000-4000-8000-000000000002')) as fixtures_removed;

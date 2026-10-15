begin;

create table public.base_players (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  opt_in boolean not null default false,
  credits integer not null default 400 check (credits >= 0),
  energy integer not null default 3 check (energy between 0 and 6),
  trophies integer not null default 0 check (trophies >= 0),
  levels integer[] not null default array[1,1,1,1,1,1]
    check (array_length(levels,1) = 6 and array_lower(levels,1) = 1 and levels <@ array[1,2,3,4,5] and array_position(levels,null) is null),
  updated_at timestamptz not null default now()
);
create table public.base_rewards (
  user_id uuid references public.base_players(user_id) on delete cascade,
  day date not null,
  primary key (user_id, day)
);
create table public.base_battles (
  id uuid primary key,
  attacker uuid not null references public.base_players(user_id) on delete cascade,
  defender uuid not null references public.base_players(user_id) on delete cascade,
  day date not null default (now() at time zone 'UTC')::date,
  created_at timestamptz not null default now(),
  result jsonb not null,
  unique(attacker, defender, day)
);
create index base_battles_defender_idx on public.base_battles(defender, created_at desc);
create table public.base_receipts (
  user_id uuid references public.base_players(user_id) on delete cascade,
  request_id uuid not null,
  action text not null,
  args jsonb not null,
  result jsonb not null,
  primary key(user_id, request_id)
);
create table public.base_friendships (
  requester uuid references public.base_players(user_id) on delete cascade,
  recipient uuid references public.base_players(user_id) on delete cascade,
  accepted boolean not null default false,
  check(requester <> recipient),
  primary key(requester, recipient)
);
create unique index base_friendships_pair_idx on public.base_friendships(least(requester,recipient), greatest(requester,recipient));

alter table public.base_players enable row level security;
alter table public.base_rewards enable row level security;
alter table public.base_battles enable row level security;
alter table public.base_receipts enable row level security;
alter table public.base_friendships enable row level security;
revoke all on public.base_players, public.base_rewards, public.base_battles, public.base_receipts, public.base_friendships from anon, authenticated;
grant select on public.base_players, public.base_rewards, public.base_battles, public.base_friendships to authenticated;
create policy base_player_self on public.base_players for select to authenticated using(user_id = (select auth.uid()));
create policy base_reward_self on public.base_rewards for select to authenticated using(user_id = (select auth.uid()));
create policy base_battle_participant on public.base_battles for select to authenticated using(attacker = (select auth.uid()) or defender = (select auth.uid()));
create policy base_friend_participant on public.base_friendships for select to authenticated using(requester = (select auth.uid()) or recipient = (select auth.uid()));

create function public.get_base_dashboard() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  today date := (now() at time zone 'UTC')::date;
  player public.base_players;
  training jsonb;
begin
  if me is null then raise exception 'authentication required'; end if;
  insert into public.base_players(user_id) values(me) on conflict do nothing;
  select * into player from public.base_players where user_id=me;
  select state->'records'->today::text into training from public.user_app_states where user_id=me;
  return jsonb_build_object(
    'player', to_jsonb(player),
    'battle_position', case when player.opt_in then (select count(distinct trophies)+1 from public.base_players where opt_in and trophies>player.trophies) else null end,
    'today', today,
    'can_claim', public.leaderboard_completed_items(training) > 0 and not exists(select 1 from public.base_rewards where user_id=me and day=today),
    'claimed_today', exists(select 1 from public.base_rewards where user_id=me and day=today),
    'requests', coalesce((select jsonb_agg(jsonb_build_object('user_id',f.requester,'name',p.display_name)) from public.base_friendships f join public.base_players p on p.user_id=f.requester where f.recipient=me and not f.accepted and p.opt_in), '[]'::jsonb),
    'battles', coalesce((select jsonb_agg(to_jsonb(b)) from (select id, created_at, attacker=me as attacking, result from public.base_battles where attacker=me or defender=me order by created_at desc,id limit 20) b), '[]'::jsonb)
  );
end;
$$;

create function public.get_base_opponents(p_search text default '', p_offset integer default 0, p_friends_only boolean default false, p_power integer default null)
returns table(user_id uuid, display_name text, levels integer[], trophies integer, defense integer, reward integer, "position" bigint, is_me boolean, is_friend boolean, requested boolean, raided_today boolean)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  return query with ranked as (
    select p.*, dense_rank() over(order by p.trophies desc) as rank
    from public.base_players p where p.opt_in
  ) select p.user_id, p.display_name, p.levels, p.trophies,
    50+15*(p.levels[4]+p.levels[5]+p.levels[6]),
    least(150,30+15*(p.levels[4]+p.levels[5]+p.levels[6])), p.rank,
    p.user_id=auth.uid(),
    exists(select 1 from public.base_friendships f where f.accepted and ((f.requester=auth.uid() and f.recipient=p.user_id) or (f.recipient=auth.uid() and f.requester=p.user_id))),
    exists(select 1 from public.base_friendships f where not f.accepted and f.requester=auth.uid() and f.recipient=p.user_id),
    exists(select 1 from public.base_battles b where b.attacker=auth.uid() and b.defender=p.user_id and b.day=(now() at time zone 'UTC')::date)
  from ranked p
  where (length(btrim(coalesce(p_search,'')))=0 or position(lower(btrim(p_search)) in lower(p.display_name))>0)
    and (not p_friends_only or exists(select 1 from public.base_friendships f where f.accepted and ((f.requester=auth.uid() and f.recipient=p.user_id) or (f.recipient=auth.uid() and f.requester=p.user_id))))
  order by case when p_power is null then 0 else abs(50+15*(p.levels[4]+p.levels[5]+p.levels[6])-greatest(0,least(p_power,1000))) end,
    p.rank,p.display_name,p.user_id offset greatest(0,least(coalesce(p_offset,0),10000)) limit 20;
end;
$$;

create function public.base_command(p_action text, p_request_id uuid, p_args jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  today date := (now() at time zone 'UTC')::date;
  player public.base_players;
  target public.base_players;
  receipt public.base_receipts;
  output jsonb;
  battle jsonb;
  opponent uuid;
  squad integer[];
  building integer;
  cost integer;
  power integer;
  defense integer;
  reward integer;
  won boolean;
  training jsonb;
  nickname text;
begin
  if me is null then raise exception 'authentication required'; end if;
  if p_request_id is null or p_args is null or jsonb_typeof(p_args)<>'object' then raise exception 'invalid request'; end if;
  insert into public.base_players(user_id) values(me) on conflict do nothing;
  select * into player from public.base_players where user_id=me for update;
  select * into receipt from public.base_receipts where user_id=me and request_id=p_request_id;
  if found then
    if receipt.action is distinct from p_action or receipt.args is distinct from p_args then raise exception 'request ID reused'; end if;
    return receipt.result || jsonb_build_object('dashboard', public.get_base_dashboard());
  end if;

  if p_action='profile' then
    nickname := btrim(p_args->>'name');
    if nickname is null or char_length(nickname) not between 2 and 20 or nickname ~ '[[:cntrl:]]' or jsonb_typeof(p_args->'opt_in') is distinct from 'boolean' then raise exception 'invalid profile'; end if;
    update public.base_players set display_name=nickname,opt_in=(p_args->>'opt_in')::boolean where user_id=me;
  elsif p_action='claim' then
    select state->'records'->today::text into training from public.user_app_states where user_id=me;
    if public.leaderboard_completed_items(training)=0 then raise exception 'sync completed training first'; end if;
    insert into public.base_rewards(user_id,day) values(me,today) on conflict do nothing;
    if found then update public.base_players set credits=credits+150,energy=least(6,energy+2) where user_id=me; end if;
  elsif p_action='upgrade' then
    building := (p_args->>'building')::integer;
    if building is null or building not between 0 and 5 then raise exception 'invalid building'; end if;
    building := building+1;
    cost := player.levels[building]*100;
    if player.levels[building]>=5 then raise exception 'maximum level'; end if;
    if player.credits<cost then raise exception 'insufficient supply'; end if;
    update public.base_players set credits=credits-cost,levels[building]=levels[building]+1 where user_id=me;
  elsif p_action='raid' then
    opponent := (p_args->>'target')::uuid;
    if opponent is null or opponent=me or not player.opt_in then raise exception 'battle participation required'; end if;
    select * into target from public.base_players where user_id=opponent and opt_in;
    if not found then raise exception 'opponent unavailable'; end if;
    if jsonb_typeof(p_args->'squad') is distinct from 'array' or jsonb_array_length(p_args->'squad')<>3 then raise exception 'invalid squad'; end if;
    select array_agg(value::integer order by ordinal) into squad from jsonb_array_elements_text(p_args->'squad') with ordinality as s(value,ordinal);
    if array_position(squad,null) is not null or not squad <@ array[0,1,2,3,4] or squad[1]+squad[2]+squad[3] not between 1 and 6 then raise exception 'invalid squad'; end if;
    if player.energy<1 then raise exception 'insufficient energy'; end if;
    if exists(select 1 from public.base_battles where attacker=me and defender=opponent and day=today) then raise exception 'already raided today'; end if;
    power := squad[1]*24+squad[2]*32+squad[3]*40+8*(player.levels[1]+player.levels[2]+player.levels[3]-3);
    defense := 50+15*(target.levels[4]+target.levels[5]+target.levels[6]);
    if defense*2<power or defense>power*2 then raise exception 'opponent outside strength range'; end if;
    won := power>=defense;
    reward := case when won then least(150,30+15*(target.levels[4]+target.levels[5]+target.levels[6])) else 20 end;
    battle := jsonb_build_object('won',won,'power',power,'defense',defense,'supply',reward,'trophies',case when won then 15 else 0 end,'attacker_name',player.display_name,'defender_name',target.display_name,'squad',squad,'defender_levels',target.levels);
    insert into public.base_battles(id,attacker,defender,result) values(p_request_id,me,opponent,battle);
    update public.base_players set energy=energy-1,credits=credits+reward,trophies=trophies+case when won then 15 else 0 end where user_id=me;
  elsif p_action in ('friend_request','friend_accept','friend_remove') then
    opponent := (p_args->>'target')::uuid;
    if opponent is null or opponent=me then raise exception 'invalid friend'; end if;
    if p_action='friend_request' then
      if not player.opt_in or not exists(select 1 from public.base_players where user_id=opponent and opt_in) then raise exception 'opponent unavailable'; end if;
      insert into public.base_friendships(requester,recipient) values(me,opponent) on conflict do nothing;
    elsif p_action='friend_accept' then
      update public.base_friendships set accepted=true where requester=opponent and recipient=me;
      if not found then raise exception 'invitation unavailable'; end if;
    else
      delete from public.base_friendships where (requester=me and recipient=opponent) or (requester=opponent and recipient=me);
    end if;
  else raise exception 'unknown command';
  end if;
  update public.base_players set updated_at=now() where user_id=me;
  output := jsonb_build_object('dashboard',public.get_base_dashboard(),'battle',battle);
  insert into public.base_receipts(user_id,request_id,action,args,result) values(me,p_request_id,p_action,p_args,output);
  return output;
end;
$$;

revoke all on function public.get_base_dashboard(), public.get_base_opponents(text,integer,boolean,integer), public.base_command(text,uuid,jsonb) from public, anon;
grant execute on function public.get_base_dashboard(), public.get_base_opponents(text,integer,boolean,integer), public.base_command(text,uuid,jsonb) to authenticated;
commit;

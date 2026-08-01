create or replace function public.save_user_app_state(next_state jsonb, expected_revision bigint)
returns table(revision bigint, updated_at timestamptz)
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_revision bigint;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select user_app_states.revision into current_revision
  from public.user_app_states
  where user_id = auth.uid()
  for update;

  if not found then
    if expected_revision is not null then
      return;
    end if;
    begin
      insert into public.user_app_states (user_id, state, revision, updated_at)
      values (auth.uid(), next_state, 1, now());
    exception when unique_violation then
      return;
    end;
    return query select 1::bigint, now();
    return;
  end if;

  if expected_revision is distinct from current_revision then
    return;
  end if;

  update public.user_app_states
  set state = next_state, revision = current_revision + 1, updated_at = now()
  where user_id = auth.uid();

  return query select current_revision + 1, now();
end;
$$;

revoke all on function public.save_user_app_state(jsonb, bigint) from public;
grant execute on function public.save_user_app_state(jsonb, bigint) to authenticated;

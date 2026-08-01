do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_app_states'
  ) then
    alter publication supabase_realtime add table public.user_app_states;
  end if;
end
$$;\n
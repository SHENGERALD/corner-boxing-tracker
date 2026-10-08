# Supabase setup

## 1. Create the app-state table

1. Open the project SQL Editor.
2. Create a new query.
3. Paste and run these migrations in order:
   - `supabase/migrations/20260730220000_create_user_app_states.sql`
   - `supabase/migrations/20260801000000_enable_user_app_states_realtime.sql`
   - `supabase/migrations/20260801010000_add_revision_safe_save.sql`
4. Confirm `public.user_app_states` appears in Table Editor with RLS enabled.

The Realtime migration adds `user_app_states` to the `supabase_realtime` publication. The revision-safe save migration creates the `save_user_app_state` RPC used by the app. If either migration is missing in an existing project, cross-device updates or uploads will not work reliably. Run the missing SQL in the project SQL Editor before testing sync again.

The migration revokes anonymous access and creates separate SELECT, INSERT, UPDATE, and DELETE policies for authenticated users. Every policy requires `auth.uid() = user_id`.

## 2. Configure Auth URLs

In Authentication > URL Configuration, set:

- Site URL: `https://shengerald.github.io/corner-boxing-tracker/`
- Redirect URL: `https://shengerald.github.io/corner-boxing-tracker/**`
- Local redirect URL: `http://127.0.0.1:5175/**`

Email confirmation is enabled. New users must open the confirmation link before their first sign-in.

## Frontend keys

The browser uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never add a secret key, service-role key, database password, or access token to the repository.

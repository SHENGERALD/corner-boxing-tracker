# Supabase setup

## 1. Create the app-state table

1. Open the project SQL Editor.
2. Create a new query.
3. Paste and run `supabase/migrations/20260730220000_create_user_app_states.sql`.
4. Confirm `public.user_app_states` appears in Table Editor with RLS enabled.

The migration revokes anonymous access and creates separate SELECT, INSERT, UPDATE, and DELETE policies for authenticated users. Every policy requires `auth.uid() = user_id`.

## 2. Configure Auth URLs

In Authentication > URL Configuration, set:

- Site URL: `https://shengerald.github.io/corner-boxing-tracker/`
- Redirect URL: `https://shengerald.github.io/corner-boxing-tracker/**`
- Local redirect URL: `http://127.0.0.1:5175/**`

Email confirmation is enabled. New users must open the confirmation link before their first sign-in.

## Frontend keys

The browser uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never add a secret key, service-role key, database password, or access token to the repository.

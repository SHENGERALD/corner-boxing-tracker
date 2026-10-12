# Supabase setup

## 1. Create the app-state table

1. Open the project SQL Editor.
2. Create a new query.
3. Paste and run these migrations in order:
   - `supabase/migrations/20260730220000_create_user_app_states.sql`
   - `supabase/migrations/20260801000000_enable_user_app_states_realtime.sql`
   - `supabase/migrations/20260801010000_add_revision_safe_save.sql`
   - `supabase/migrations/20261008000000_weekly_leaderboard.sql`
4. Confirm `public.user_app_states` appears in Table Editor with RLS enabled.

The Realtime migration adds `user_app_states` to the `supabase_realtime` publication. The revision-safe save migration creates the `save_user_app_state` RPC used by the app. If either migration is missing in an existing project, cross-device updates or uploads will not work reliably. Run the missing SQL in the project SQL Editor before testing sync again.

The migration revokes anonymous access and creates separate SELECT, INSERT, UPDATE, and DELETE policies for authenticated users. Every policy requires `auth.uid() = user_id`.

The leaderboard migration creates private, opt-in profiles and an authenticated RPC. Apply it before expecting the weekly leaderboard to load; the UI reports it as unavailable until then. Only display names and weekly aggregate scores are returned, never other users' records. The week resets Monday at 00:00 UTC. Scoring is 20 points per active day plus 5 points per distinct completed item, capped at five items per day. The score is an honor-system metric because account owners can edit their own training data.

## 2. Configure Auth URLs

In Authentication > URL Configuration, set:

- Site URL: `https://shengerald.github.io/corner-boxing-tracker/`
- Redirect URL: `https://shengerald.github.io/corner-boxing-tracker/**`
- Local redirect URL: `http://127.0.0.1:5175/**`

Email confirmation is enabled. New users must open the confirmation link before their first sign-in.

## Local leaderboard verification

Run `npm run test:leaderboard-db` for isolated PostgreSQL migration, scoring,
and role-policy checks using PGlite. This does not deploy anything to Supabase.
Run `npm test -- --testTimeout=15000` and `npm run build` for frontend verification.

Normal `npm run dev` does not load `.env.production`. For cloud testing, configure
the public Supabase values in an untracked `.env.local`, and allow the actual
local port in Auth redirect URLs. Local database tests do not replace testing
two real signed-in accounts against the deployed migration.

After deployment, `supabase/tests/weekly_leaderboard_smoke.sql` exercises two
temporary identities under the authenticated role in a single transaction.
It checks opt-in, score updates, profile isolation, and opt-out, then rolls back
all fixtures. It does not validate browser sign-in or the Auth token lifecycle.

The adventure dialog has separate Adventure and Leaderboard tabs. Successful
training syncs refresh rankings without overwriting an unsaved nickname draft.
The weekly period uses UTC; the reset is also displayed in the device timezone.

## Frontend keys

The browser uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never add a secret key, service-role key, database password, or access token to the repository.

## Deployment verification (2026-10-11)

The weekly leaderboard migration was applied to the CORNER production project
`ogiehayfeomqeygqsdgx` through its SQL Editor in a transaction. The two-identity
smoke test passed against that database: participation, 25-to-30 point updates,
own-profile isolation, and opt-out. All fixtures were rolled back, and a separate
query confirmed no test users or training records remained.

RLS and authenticated RPC access were confirmed. Anonymous REST requests now
return HTTP 401 / SQLSTATE 42501 for both the RPC and profiles table, rather than
missing-schema errors. This verifies deployment and database behavior, not two
real browser sign-ins or a new GitHub Pages frontend release.

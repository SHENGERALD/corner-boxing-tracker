# Corner release checklist

## Supabase

1. Run every SQL file in `supabase/migrations/` in chronological order.
2. Deploy the function: `supabase functions deploy delete-account`.
3. Set `ALLOWED_ORIGIN=https://shengerald.github.io` for the function. Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` automatically; never add the service-role key to Vite variables or GitHub Pages.
4. Test password recovery and account deletion using a disposable account.

## Device and release QA

- [ ] iPhone Safari portrait: no horizontal scroll, navigation remains accessible, and the timer is circular.
- [ ] Cold offline launch after a successful online visit: explicitly verify the current network-first service worker behavior before claiming offline support.
- [ ] OAuth callback returns to the GitHub Pages URL and restores the signed-in session.
- [ ] Two devices edit separate dates, then both edits appear after sync.
- [ ] Two devices edit the same date: latest record timestamp wins without losing another date.
- [ ] Password recovery has a generic outcome and works from the configured redirect URL.
- [ ] Account deletion removes cloud data and signs the account out; a failed deletion leaves local data intact.
- [ ] Run `npm test -- --run`, `npm run build`, and `npm audit --omit=dev --audit-level=moderate`.

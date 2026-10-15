# Training Base Implementation

Keep the green prototype at `?preview=base`; expose the authenticated game at
`?game=base` and link it from Today. Reuse the original map artwork.

## Tasks

1. Add private server-owned player resources, daily training rewards, battle
   receipts, and reciprocal friend requests. All writes use authenticated RPCs.
   Reward claims use synced records and a UTC date; grant once per day.
2. Add idempotent commands with per-player row locking. Reject self raids,
   private defenders, duplicate daily targets, invalid squads, unaffordable
   upgrades, missing energy, and strength mismatches. Keep defender buildings
   and training data intact. Victory earns trophies; rest does not subtract.
3. Add authenticated API wrappers and the real game view: loading/retry,
   profile opt-in, claim, upgrade, search/scout, squad, battle history,
   friend invitations, training-week ranking and independent battle ranking.
   Lock pending commands, retain request IDs on ambiguous failures, and clear
   private UI immediately when switching accounts.
4. Run isolated PostgreSQL role/economy/idempotency tests, focused UI/API tests,
   the existing frontend suite, production build, and visual checks. Document
   deployment prerequisites and distinguish local verification from live E2E.

## Release

Do not push or apply the new production schema as part of local implementation.
The game must present a useful recoverable state if its migration is missing.
Database tests do not stand in for two real browser sessions. No actual
physical-training validation is claimed: training logs remain user-entered.

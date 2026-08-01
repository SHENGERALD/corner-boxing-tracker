# Production Readiness Design

## Goal

Make Corner safe to use across devices and accurate for boxing, while adding recoverable authentication, permanent self-service account deletion, and repeatable release checks.

## Scope

1. Week and archive views use the saved weekly plan and each record's plan snapshot.
2. Statistics distinguish strength volume from boxing training load. Strength volume remains kilograms; boxing load is logged training minutes and completed rounds.
3. Cloud synchronization uses the table revision as optimistic concurrency control. A conflicting write refetches, merges record-level timestamps, and retries once.
4. Authentication adds password-reset email and a permanent account-deletion flow. A Supabase Edge Function validates the JWT, deletes the user's state row, and then deletes the Auth user with the service-role client. The browser never receives the service-role key.
5. QA adds regression coverage for schedule propagation, metric calculations, conflict retry, reset flow invocation, and offline/service-worker cache policy. A manual iPhone and two-device checklist remains for physical-device verification.

## Data and Security

- Extend `user_app_states` with the existing `revision` field as a write precondition, incrementing it on each successful update.
- The client reads `state`, `updated_at`, and `revision`; writes only when the known revision still matches.
- Realtime updates retain their merge behavior and update the locally held revision.
- Account deletion requires an explicit typed confirmation, clears local per-user state only after the Edge Function succeeds, and signs out.
- Password reset uses Supabase's recovery email with the existing GitHub Pages redirect URL.
- Backup import adds a maximum file size and limits labels, notes, custom drills, and image URLs to accepted safe values.

## UX

- Stats overview shows `Strength volume` only when strength sets exist; otherwise it shows `Boxing load` using rounds and logged minutes.
- History and Week views show the exact plan used for the selected date, preserving prior records via `planSnapshot`.
- Auth panel exposes `Forgot password?` below password login and an `Account deletion` action only for signed-in users.
- Destructive account deletion has a dedicated confirmation sheet, not a browser-native prompt.

## Failure Handling

- A stale revision triggers merge/refetch/retry; a second conflict leaves the data intact locally and displays `Sync failed`.
- Password recovery reports a neutral success message to reduce account enumeration.
- Account deletion failure does not clear local state or sign the user out.
- Invalid/oversized backups are rejected before parsing.

## Verification

- Unit tests cover revision-aware merging and boxing/strength metrics.
- App tests cover schedule updates in Week and Archive, reset-password invocation, and account-delete confirmation state.
- Production build and full Vitest suite must pass.
- Manual release checklist covers iPhone Safari, Google OAuth redirect, two logged-in devices editing distinct records simultaneously, conflict retry, account deletion, and a cold offline launch.

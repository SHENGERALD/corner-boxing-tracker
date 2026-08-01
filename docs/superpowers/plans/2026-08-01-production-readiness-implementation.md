# Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make scheduling, statistics, synchronization, authentication, and release checks reliable for a public Corner release.

**Architecture:** Keep AppState local-first. Add a revision-aware Supabase RPC for atomic state writes, retain the existing record-level merge as conflict resolution, and add a narrowly scoped Edge Function for permanent self-service account deletion. Extract metric and schedule lookup helpers from App.tsx only where tests need stable boundaries.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Supabase Postgres/RLS, Supabase Edge Functions.

## Global Constraints

- Do not expose a Supabase service-role key to the browser or GitHub Pages.
- Preserve existing AppState backups and record-level timestamp merge behavior.
- Strength volume is kilograms; boxing load is logged rounds and minutes.
- Do not delete local state after a remote deletion failure.
- Verify every behavioral change with a failing regression test first.

---

### Task 1: Make Week and Archive use the configured schedule

**Files:**
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- `WeekView` and `LogView` receive `weeklyPlan: DayPlan[]`.
- Their plan lookup is `record.planSnapshot ?? getPlanForWeekday(getWeekday(date), weeklyPlan)`.

- [ ] **Step 1: Write failing UI tests**

```tsx
it("shows an edited weekly plan in Week", async () => {
  // edit Thursday session, navigate to Week, expect the edited title
});

it("shows a schedule snapshot in Archive", async () => {
  // record a day, edit its schedule, navigate to Archive, expect original title
});
```

- [ ] **Step 2: Run `npm test -- --run src/App.test.tsx` and confirm the new assertions fail because Week and Archive use default plan data.**

- [ ] **Step 3: Pass `state.weeklyPlan` into WeekView and LogView and use snapshots before configured plans.**

- [ ] **Step 4: Re-run `npm test -- --run src/App.test.tsx` and confirm both new tests pass.**

### Task 2: Separate boxing load from strength volume

**Files:**
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- `getRecordBoxingLoad(record)` returns `{ rounds: number; minutes: number }` from item logs and custom item units.
- Overview selects strength kilograms when nonzero; otherwise shows boxing rounds/minutes.

- [ ] **Step 1: Add a failing statistics test for a boxing-only recorded session that asserts the overview does not label zero kilograms as training volume.**

- [ ] **Step 2: Run `npm test -- --run src/App.test.tsx` and confirm the test fails on the existing `0 kg` output.**

- [ ] **Step 3: Implement boxing load aggregation and conditional bilingual overview labels. Keep existing kilogram charts for strength data.**

- [ ] **Step 4: Re-run the focused test, then the complete test suite.**

### Task 3: Add revision-aware cloud persistence

**Files:**
- Create: `supabase/migrations/20260801010000_add_revision_safe_save.sql`
- Modify: `src/domain/cloud.ts`
- Modify: `src/App.tsx`
- Test: `src/domain/cloud.test.ts`

**Interfaces:**
- `save_user_app_state(next_state jsonb, expected_revision bigint)` returns no row on revision mismatch and a new revision on success.
- Cloud state reads include `revision`.
- Client stores `cloudRevision`, refetches and merges after conflict, then retries once.

- [ ] **Step 1: Add failing cloud tests for a revision mismatch and a retry that preserves independently edited records.**

- [ ] **Step 2: Run `npm test -- --run src/domain/cloud.test.ts` and confirm the tests fail because revision-aware save helpers do not exist.**

- [ ] **Step 3: Add the RLS-respecting Postgres RPC. It locks the authenticated user's row, inserts revision 1 only when expected revision is null, updates only on a matching revision, and returns no row on conflict.**

- [ ] **Step 4: Update App cloud state reads, realtime handling, and debounced uploads to use revision-aware save/retry.**

- [ ] **Step 5: Re-run focused cloud tests and then all tests.**

### Task 4: Add password recovery and permanent account deletion

**Files:**
- Create: `supabase/functions/delete-account/index.ts`
- Create: `supabase/functions/delete-account/deno.json`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Test: `src/App.test.tsx`
- Create: `docs/release-checklist.md`

**Interfaces:**
- `supabase.auth.resetPasswordForEmail(email, { redirectTo })` sends a recovery message.
- `functions.invoke("delete-account")` invokes a JWT-verified function.
- Edge Function creates a server client using `SUPABASE_SERVICE_ROLE_KEY`, deletes `user_app_states`, then deletes `auth.users` via `auth.admin.deleteUser`.

- [ ] **Step 1: Add failing app tests for a visible password-recovery control and for account deletion only clearing local state after a successful invoked function.**

- [ ] **Step 2: Run `npm test -- --run src/App.test.tsx` and confirm each new test fails.**

- [ ] **Step 3: Add recovery UI and a two-step typed deletion confirmation.**

- [ ] **Step 4: Implement the Edge Function with `Authorization` JWT verification and an explicit `DELETE` request requirement. Return only generic success/failure messages.**

- [ ] **Step 5: Add release checklist instructions: apply migrations, deploy `delete-account`, set the function secret in Supabase, and test deletion with a disposable account.**

- [ ] **Step 6: Re-run focused app tests and full suite.**

### Task 5: Harden backup import and release QA

**Files:**
- Modify: `src/domain/storage.ts`
- Modify: `src/domain/storage.test.ts`
- Modify: `public/sw.js`
- Modify: `docs/release-checklist.md`

**Interfaces:**
- `importState` rejects backups exceeding 2 MB and strings exceeding defined UI-safe bounds.
- Service worker precaches the generated shell dependencies through a deploy-generated manifest or explicitly documents network-first limitations until a bundler-integrated PWA plugin is adopted.

- [ ] **Step 1: Add failing storage tests for an oversized backup and an invalid external custom-drill image URL.**

- [ ] **Step 2: Run `npm test -- --run src/domain/storage.test.ts` and confirm both failures.**

- [ ] **Step 3: Add import guards for payload size, label/note lengths, and allowed image URLs.**

- [ ] **Step 4: Replace the hand-maintained service-worker policy with a build-integrated precache solution, or remove the offline claim and document the current network-first behavior.**

- [ ] **Step 5: Add a manual release matrix for iPhone Safari, cold offline launch, OAuth callback, two-device conflict, recovery email, and permanent deletion.**

- [ ] **Step 6: Run `npm test -- --run`, `npm run build`, and `npm audit --omit=dev --audit-level=moderate`.**

## Plan Self-Review

- Scope covers the five approved priorities without adding unrelated social or coaching features.
- Every production behavior has an associated test or a documented physical-device verification.
- The deletion function is isolated from the browser and requires Supabase secrets only at deployment.

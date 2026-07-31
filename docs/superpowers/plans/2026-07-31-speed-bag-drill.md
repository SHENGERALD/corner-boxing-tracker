# Speed Bag Drill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Speed Bag as a searchable built-in boxing equipment drill with a default quantity of three rounds.

**Architecture:** Extend the existing static `drillLibrary` entry list; the current filtering, favorites, Today-add, and Schedule-add flows will consume the new drill without UI changes. Add a focused domain test first to lock the bilingual metadata and default logging values.

**Tech Stack:** TypeScript, Vitest, React 19 existing drill-library flow

## Global Constraints

- ID must be `speed-bag`.
- Domain must be `boxing`.
- Category must be `equipment`.
- Names must be `速度球` and `Speed Bag`.
- Cues must be `放鬆肩膀，維持穩定節奏` and `Relax shoulders, keep a steady rhythm`.
- Default unit must be `rounds` and default quantity must be `3`.
- Do not change the default weekly schedule.
- Add no dependencies and refactor no unrelated code.

---

### Task 1: Add Speed Bag To The Drill Library

**Files:**
- Modify: `src/domain/drills.test.ts:4-16`
- Modify: `src/domain/drills.ts:13`

**Interfaces:**
- Consumes: `filterDrills(drills, options): Drill[]` and the existing `d(...): Drill` helper.
- Produces: a `Drill` with ID `speed-bag` available through `drillLibrary`.

- [x] **Step 1: Write the failing test**

Add this test inside the existing `describe("drill library", ...)` block:

```ts
it("includes Speed Bag as a three-round boxing equipment drill", () => {
  expect(filterDrills(drillLibrary, {
    query: "speed bag",
    domain: "boxing",
    category: "equipment",
    favoriteIds: [],
    favoritesOnly: false,
  })).toEqual([
    expect.objectContaining({
      id: "speed-bag",
      domain: "boxing",
      category: "equipment",
      name: { zhTW: "速度球", en: "Speed Bag" },
      cue: {
        zhTW: "放鬆肩膀，維持穩定節奏",
        en: "Relax shoulders, keep a steady rhythm",
      },
      defaultUnit: "rounds",
      defaultQuantity: 3,
    }),
  ]);
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- src/domain/drills.test.ts
```

Expected: FAIL because the filtered result is an empty array and no `speed-bag` entry exists.

- [x] **Step 3: Add the minimal library entry**

Append this entry to the equipment row in `src/domain/drills.ts`:

```ts
d(
  "speed-bag",
  "equipment",
  "速度球",
  "Speed Bag",
  "放鬆肩膀，維持穩定節奏",
  "Relax shoulders, keep a steady rhythm",
)
```

The helper defaults provide `domain: "boxing"`, `defaultUnit: "rounds"`, and `defaultQuantity: 3`.

- [x] **Step 4: Run focused and full verification**

Run:

```bash
npm test -- src/domain/drills.test.ts
npm test
npm run build
git diff --check
```

Expected: the focused test passes, all existing tests pass, the production build succeeds, and `git diff --check` returns no output.

- [x] **Step 5: Commit the implementation**

```bash
git add src/domain/drills.test.ts src/domain/drills.ts docs/superpowers/plans/2026-07-31-speed-bag-drill.md
git commit -m "feat: add speed bag drill"
```

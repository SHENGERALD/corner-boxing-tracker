# Calendar and Boxing Drill Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert Week into a dark monthly training calendar and Log into a searchable boxing drill library that supports favorites and scheduling custom drills onto any date.

**Architecture:** Keep React state centralized in `App`, but move static drill definitions and calendar math into small domain modules. Persist version-2 application state in localStorage while migrating existing version-1 backups. Render custom scheduled drills beside the static day plan, then derive calendar totals and labels from the same stored records.

**Tech Stack:** Vite, React 19, TypeScript, CSS, Vitest, Testing Library, localStorage, lucide-react.

## Global Constraints

- Preserve the existing Today checklist, notes, language selection, JSON backup, and static weekly plan.
- Default visual direction is charcoal-black with off-white text and one muted-green accent.
- Search must work for Traditional Chinese and English drill names.
- The first drill library contains approximately 30 curated boxing drills in six categories.
- Custom drills use only `rounds` or `minutes` and require positive quantities.
- Existing version-1 state/backups load safely with no custom drills or favorites; exports use version 2.
- Do not add user-authored drills, video hosting, cloud sync, social features, load tracking, or unsupervised sparring scheduling.
- Preserve 320px mobile usability and keyboard-accessible controls.

---

## File Structure

- `src/domain/types.ts`: shared custom-drill, drill-library, and persisted-state types.
- `src/domain/storage.ts`: version-1 migration, validation, persistence, and import/export.
- `src/domain/drills.ts`: curated bilingual drill data and pure search/filter helpers.
- `src/domain/dates.ts`: Monday-first month-grid construction.
- `src/domain/progress.ts`: completion and calendar totals including custom drills.
- `src/components/AddDrillDialog.tsx`: date/quantity/unit/note dialog that emits a validated custom item.
- `src/components/CalendarView.tsx`: month grid and day summary cells.
- `src/components/DrillLibrary.tsx`: search, category/favorites filters, drill cards, and add/favorite actions.
- `src/App.tsx`: app-state ownership and wiring for Today, calendar, library, and backup.
- `src/styles.css`: complete dark, responsive visual system.

### Task 1: Add version-2 custom-drill persistence

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/domain/storage.ts`
- Modify: `src/domain/storage.test.ts`

**Interfaces:**
- Produces `CustomTrainingItem { id, drillId, quantity, unit, note?, completed }`.
- Produces `AppState { version: 2, language, records, favoriteDrillIds }`.
- Produces `normalizeRecord(record): TrainingRecord` with `customItems: []` for legacy records.

- [ ] **Step 1: Write failing migration tests**

```ts
it("migrates version 1 records and exports version 2 state", () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    version: 1,
    language: "zh-TW",
    records: { "2026-07-30": { completedItemIds: ["coach-class"] } },
  }));

  expect(loadState()).toMatchObject({
    version: 2,
    favoriteDrillIds: [],
    records: { "2026-07-30": { customItems: [] } },
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx vitest run src/domain/storage.test.ts`

Expected: FAIL because `loadState()` currently only accepts version 1.

- [ ] **Step 3: Implement strict version-1 migration and version-2 validation**

```ts
export function migrateV1State(value: V1AppState): AppState {
  return {
    version: 2,
    language: value.language,
    favoriteDrillIds: [],
    records: Object.fromEntries(
      Object.entries(value.records).map(([date, record]) => [
        date,
        { ...record, customItems: [] },
      ])
    ),
  };
}
```

Validate `quantity > 0`, valid `unit`, string IDs, and arrays before migration/import. Keep invalid backups from replacing local state.

- [ ] **Step 4: Run storage tests to verify they pass**

Run: `npx vitest run src/domain/storage.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the persistence unit**

```bash
git add src/domain/types.ts src/domain/storage.ts src/domain/storage.test.ts
git commit -m "feat: persist custom boxing drills"
```

### Task 2: Add curated drill library and search/filter selectors

**Files:**
- Create: `src/domain/drills.ts`
- Create: `src/domain/drills.test.ts`

**Interfaces:**
- Produces `Drill { id, category, name, cue, defaultUnit, defaultQuantity, level }`.
- Produces `drillCategories` and `filterDrills(drills, { query, category, favorites })`.
- Consumes `Language`, `LocalizedLabel`, and `CustomTrainingItem["unit"]`.

- [ ] **Step 1: Write failing selector tests**

```ts
it("matches Traditional Chinese and English names and honors favorites", () => {
  expect(filterDrills(drillLibrary, { query: "jab", category: "all", favorites: [] }))
    .toEqual(expect.arrayContaining([expect.objectContaining({ id: "jab" })]));
  expect(filterDrills(drillLibrary, { query: "", category: "defense", favorites: ["slip" ] }))
    .toEqual([expect.objectContaining({ id: "slip" })]);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx vitest run src/domain/drills.test.ts`

Expected: FAIL because the drill module does not exist.

- [ ] **Step 3: Implement 30 bilingual drills and deterministic filtering**

Create six categories: fundamentals, footwork, offense, defense, equipment, conditioning. Include the specified beginner staples: stance, guard, skipping, shadow, forward/back/lateral movement, pivot, jab/cross/hook/uppercut, basic combinations, high guard/parry/slip/roll/pull, bag/double-end/slip-rope/pads, core/Zone 2/intervals/mobility. Return favorites-only results only when `favoritesOnly` is true; never mutate source data.

- [ ] **Step 4: Run drill tests to verify they pass**

Run: `npx vitest run src/domain/drills.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the drill domain unit**

```bash
git add src/domain/drills.ts src/domain/drills.test.ts
git commit -m "feat: add boxing drill library"
```

### Task 3: Add month-grid and custom-item progress calculations

**Files:**
- Modify: `src/domain/dates.ts`
- Modify: `src/domain/dates.test.ts`
- Modify: `src/domain/progress.ts`
- Modify: `src/domain/progress.test.ts`

**Interfaces:**
- Produces `getMonthGrid(anchorDate): Date[]` with 42 Monday-first cells.
- Produces `getCalendarDaySummary(plan, record, drills)` returning `rounds`, `minutes`, `labels`, and `isComplete`.
- Consumes `CustomTrainingItem` and `Drill`.

- [ ] **Step 1: Write failing month-grid and summary tests**

```ts
it("returns a Monday-first six-week grid for July 2026", () => {
  expect(getMonthGrid(new Date(2026, 6, 1)).map(toDateKey).slice(0, 7)).toEqual([
    "2026-06-29", "2026-06-30", "2026-07-01", "2026-07-02",
    "2026-07-03", "2026-07-04", "2026-07-05",
  ]);
});

it("reports rounds and labels from completed custom drills", () => {
  expect(getCalendarDaySummary(plan, { completedItemIds: [], customItems: [{
    id: "item-1", drillId: "jab", quantity: 4, unit: "rounds", completed: true,
  }] }, drillLibrary)).toMatchObject({ rounds: 4, labels: ["Jab"] });
});
```

- [ ] **Step 2: Run focused tests to verify they fail**

Run: `npx vitest run src/domain/dates.test.ts src/domain/progress.test.ts`

Expected: FAIL because month-grid and calendar-summary helpers do not exist.

- [ ] **Step 3: Implement pure date and summary helpers**

Use `getWeekDates` conventions: create dates at local noon, calculate Monday as index zero, and include six complete weeks. Summary labels use the drill's localized display name and only include the first two distinct scheduled drills. A custom item contributes totals when scheduled; completion only affects status styling.

- [ ] **Step 4: Run date and progress tests to verify they pass**

Run: `npx vitest run src/domain/dates.test.ts src/domain/progress.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the calendar calculation unit**

```bash
git add src/domain/dates.ts src/domain/dates.test.ts src/domain/progress.ts src/domain/progress.test.ts
git commit -m "feat: calculate calendar training summaries"
```

### Task 4: Render and persist custom drills in Today

**Files:**
- Create: `src/components/AddDrillDialog.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- `AddDrillDialog({ drill, initialDate, language, onAdd, onClose })` emits a complete `CustomTrainingItem`.
- `onAdd(dateKey: string, item: CustomTrainingItem): void` updates the selected record in `App`.

- [ ] **Step 1: Write a failing UI test for adding and restoring a drill**

```tsx
it("adds a drill to a chosen date and restores it after remount", async () => {
  render(<App initialDate={new Date(2026, 6, 30, 12)} />);
  await user.click(screen.getByRole("button", { name: "動作庫" }));
  await user.click(screen.getByRole("button", { name: "加入 Jab" }));
  await user.clear(screen.getByLabelText("回合數"));
  await user.type(screen.getByLabelText("回合數"), "4");
  await user.click(screen.getByRole("button", { name: "加入訓練" }));
  await user.click(screen.getByRole("button", { name: "今天" }));
  expect(screen.getByRole("checkbox", { name: "Jab — 4 回合" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused UI test to verify it fails**

Run: `npx vitest run src/App.test.tsx`

Expected: FAIL because Drill Library and custom drill controls do not exist.

- [ ] **Step 3: Implement custom item editing in Today and the accessible add dialog**

Render custom items after planned items. Their visible label contains the drill name and quantity/unit; checkbox toggles `completed`. The dialog defaults to selected date and the library drill's recommendation, prevents non-positive quantities, uses a native date input, and has Cancel/Confirm buttons.

- [ ] **Step 4: Run App tests to verify they pass**

Run: `npx vitest run src/App.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the custom scheduling UI**

```bash
git add src/components/AddDrillDialog.tsx src/App.tsx src/App.test.tsx
git commit -m "feat: schedule custom boxing drills"
```

### Task 5: Replace Week with a monthly calendar log

**Files:**
- Create: `src/components/CalendarView.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- `CalendarView({ month, language, records, drills, onMonthChange, onSelectDate })` renders 42 date buttons.
- `onSelectDate(date: Date): void` sets Today to that date without overwriting records.

- [ ] **Step 1: Write a failing calendar UI test**

```tsx
it("shows a scheduled drill on the monthly calendar and opens its date", async () => {
  render(<App initialDate={new Date(2026, 6, 30, 12)} />);
  // Seeded custom Jab is scheduled on July 30.
  await user.click(screen.getByRole("button", { name: "本週" }));
  expect(screen.getByRole("button", { name: /7月30日.*4R.*Jab/ })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /7月30日.*4R.*Jab/ }));
  expect(screen.getByRole("checkbox", { name: "Jab — 4 回合" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused UI test to verify it fails**

Run: `npx vitest run src/App.test.tsx`

Expected: FAIL because Week still renders a seven-day list.

- [ ] **Step 3: Implement month navigation and calendar cells**

Use `getMonthGrid`. Display Monday-first headers, navigation buttons with localized accessible labels, muted out-of-month days, and concise totals (`4R`, `30m`, or `4R · 30m`). Do not show more than two labels per cell. Keep cells as semantic buttons and route selection through `openDate`.

- [ ] **Step 4: Run App tests to verify they pass**

Run: `npx vitest run src/App.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the calendar UI**

```bash
git add src/components/CalendarView.tsx src/App.tsx src/App.test.tsx
git commit -m "feat: show monthly boxing calendar"
```

### Task 6: Build the searchable, favoriteable Drill Library

**Files:**
- Create: `src/components/DrillLibrary.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- `DrillLibrary({ drills, favoriteDrillIds, language, onToggleFavorite, onSchedule })` owns view-only filter state.
- `onToggleFavorite(drillId: string): void` persists favorite IDs in `AppState`.
- `onSchedule(drill: Drill): void` opens `AddDrillDialog`.

- [ ] **Step 1: Write failing library UI tests**

```tsx
it("searches by English name, filters by category, and persists favorites", async () => {
  render(<App initialDate={new Date(2026, 6, 30, 12)} />);
  await user.click(screen.getByRole("button", { name: "動作庫" }));
  await user.type(screen.getByPlaceholderText("搜尋動作"), "jab");
  expect(screen.getByText("Jab")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "收藏 Jab" }));
  await user.click(screen.getByRole("button", { name: "收藏" }));
  expect(screen.getByText("Jab")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused UI tests to verify they fail**

Run: `npx vitest run src/App.test.tsx`

Expected: FAIL because Log is a record list rather than a drill library.

- [ ] **Step 3: Implement search, chips, cards, favorites, and empty states**

Use `filterDrills` for all filtering. Do not duplicate drill definitions inside UI components. Each card exposes a category tag, bilingual/localized name, short cue, default unit, one favorite button, and one schedule button. Empty results include a clear reset-filter action.

- [ ] **Step 4: Run App tests to verify they pass**

Run: `npx vitest run src/App.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the library UI**

```bash
git add src/components/DrillLibrary.tsx src/App.tsx src/App.test.tsx
git commit -m "feat: browse and favorite boxing drills"
```

### Task 7: Apply the dark Steady-inspired visual system and verify the deliverable

**Files:**
- Modify: `src/styles.css`
- Modify: `src/domain/i18n.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes existing semantic class names from Today, `CalendarView`, `DrillLibrary`, and `AddDrillDialog`.

- [ ] **Step 1: Write a failing UI assertion for the renamed navigation labels**

```tsx
it("uses the localized Drill Library navigation label", () => {
  render(<App initialDate={new Date(2026, 6, 30, 12)} />);
  expect(screen.getByRole("button", { name: "動作庫" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx vitest run src/App.test.tsx`

Expected: FAIL because the current navigation still labels the view `紀錄`.

- [ ] **Step 3: Implement the visual refresh and localized copy**

Set dark CSS custom properties, unify card and input surfaces, give selected/complete states muted-green contrast, and style the calendar/library/add panel for mobile-first two-column cards when space allows. Replace warm-white styles only after all semantic controls exist. Preserve visible labels, focus outlines, reduced-motion support, and no text clipping at 320px.

- [ ] **Step 4: Run all tests and production build**

Run: `npm test && npm run build`

Expected: all tests PASS and Vite completes with exit code 0.

- [ ] **Step 5: Commit the visual system**

```bash
git add src/styles.css src/domain/i18n.ts src/App.tsx src/App.test.tsx
git commit -m "feat: restyle corner as dark training log"
```

### Task 8: Update the design and plan status after verification

**Files:**
- Modify: `docs/superpowers/specs/2026-07-30-calendar-training-library-design.md`
- Modify: `docs/superpowers/plans/2026-07-30-calendar-training-library-implementation.md`

- [ ] **Step 1: Mark implementation tasks complete and add actual verification evidence**

Record the final test-file count, test count, and build result in a short `## Verification` section. Do not claim completion without a fresh `npm test` and `npm run build` result.

- [ ] **Step 2: Commit the verified documentation**

```bash
git add docs/superpowers/specs/2026-07-30-calendar-training-library-design.md docs/superpowers/plans/2026-07-30-calendar-training-library-implementation.md
git commit -m "docs: record calendar library verification"
```

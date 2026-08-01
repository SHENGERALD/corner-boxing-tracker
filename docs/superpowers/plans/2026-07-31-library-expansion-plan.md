# Library Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a curated 50-70 exercise strength library with wger images, body-part and equipment filtering, improved bilingual search, and a cardio category inside the strength library.

**Architecture:** Extend existing `Drill` metadata rather than replacing IDs, so current scheduled drills and records remain valid. Keep curation and search matching in `src/domain/drills.ts`; let `DrillLibraryView`, the custom-drill dialog, and schedule picker consume the equipment metadata and filter contract.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Vite, direct wger image URLs.

## Global Constraints

- Preserve existing strength drill IDs and scheduled-record compatibility.
- Use only verified wger image URLs and retain the existing wger attribution.
- Target approximately 50-70 common strength exercises after deduplication.
- Search matches Traditional Chinese, English, equipment, body part, and explicit synonyms.
- Cardio belongs to the strength domain under a dedicated cardio category and defaults to minute-based logging.
- Do not alter training-record or weekly-plan interfaces for this library-only change.

---

### Task 1: Extend Drill Metadata and Filtering Contract

**Files:**
- Modify: `src/domain/drills.ts`
- Modify: `src/domain/storage.ts`
- Test: `src/domain/drills.test.ts`
- Test: `src/domain/storage.test.ts`

**Interfaces:**
- Produces: optional `Drill.equipment` and `Drill.searchTerms`
- Produces: `filterDrills(..., { equipment })` for combined filtering

- [ ] **Step 1: Write failing domain/filter tests**

```ts
expect(filterDrills(drillLibrary, {
  query: "啞鈴", domain: "strength", category: "chest", equipment: "dumbbell",
  favoriteIds: [], favoritesOnly: false,
})).toEqual(expect.arrayContaining([expect.objectContaining({ id: "dumbbell-bench-press" })]));

expect(filterDrills(drillLibrary, {
  query: "跑步", domain: "strength", category: "cardio", equipment: "all",
  favoriteIds: [], favoritesOnly: false,
})).toEqual(expect.arrayContaining([expect.objectContaining({ id: "cardio-run" })]));
```

- [ ] **Step 2: Run the focused tests to verify failure**

Run: `npm test -- --run src/domain/drills.test.ts src/domain/storage.test.ts`

Expected: TypeScript/test failures because equipment filtering and the cardio category do not yet exist.

- [ ] **Step 3: Add the minimal compatible metadata model**

```ts
export type EquipmentType = "barbell" | "dumbbell" | "kettlebell" | "cable" | "hammer" | "machine" | "bodyweight";

export interface Drill {
  // existing fields
  equipment?: EquipmentType;
  searchTerms?: string[];
}
```

Update `filterDrills` to normalize lower-case whitespace, search names plus `searchTerms`, and require `equipment` only when the caller supplies a non-`"all"` value. Extend custom-drill validation to accept the dedicated cardio category; custom drills may omit equipment and image metadata.

- [ ] **Step 4: Run the focused tests to verify passing**

Run: `npm test -- --run src/domain/drills.test.ts src/domain/storage.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the data-model slice**

```bash
git add src/domain/drills.ts src/domain/storage.ts src/domain/drills.test.ts src/domain/storage.test.ts
git commit -m "feat: add drill equipment and cardio category"
```

### Task 2: Curate and Verify the Exercise Libraries

**Files:**
- Modify: `src/domain/drills.ts`
- Test: `src/domain/drills.test.ts`

**Interfaces:**
- Consumes: `Drill.equipment`, `Drill.searchTerms`, and the existing strength domain from Task 1.
- Produces: a 50-70 item, non-duplicated strength library and minute-based cardio drills inside the strength domain.

- [ ] **Step 1: Write failing library-integrity tests**

```ts
const strength = drillLibrary.filter((drill) => drill.domain === "strength");
expect(strength.every((drill) => drill.imageUrl && drill.imageSource === "wger" && drill.equipment)).toBe(true);
expect(new Set(strength.map((drill) => drill.name.en.toLowerCase())).size).toBe(strength.length);
```

Add a cardio assertion that every drill has `defaultUnit: "minutes"` and a unique ID.

- [ ] **Step 2: Run the focused test to verify failure**

Run: `npm test -- --run src/domain/drills.test.ts`

Expected: FAIL because retained legacy strength drills lack images/equipment and duplicate entries remain.

- [ ] **Step 3: Replace duplicates and expand curated data**

Retain legacy IDs such as `bench-press`, `barbell-row`, and `back-squat`; enrich them with verified wger images, equipment, and search terms. Remove wger additions with the same movement. Add non-overlapping common exercises until the strength collection reaches 50-70 items across chest, back, legs, shoulders, arms, core, and calves. Add cardio-category entries in the strength domain for running, cycling, rowing machine, jump rope, stair climber, swimming, and interval conditioning.

Use the project’s final helper signature rather than duplicating metadata literals at every call site.

- [ ] **Step 4: Validate every remote image URL**

Run a read-only URL check against the exact `imageUrl` values used by strength drills.

Expected: every URL responds successfully; replace any failing URL before proceeding.

- [ ] **Step 5: Run library tests to verify passing**

Run: `npm test -- --run src/domain/drills.test.ts`

Expected: PASS, with all retained strength drills image-backed and duplicate-free.

- [ ] **Step 6: Commit the curated library**

```bash
git add src/domain/drills.ts src/domain/drills.test.ts
git commit -m "feat: expand strength and cardio drill libraries"
```

### Task 3: Add Library UI Controls and Custom-Drill Support

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: `TrainingDomain`, `EquipmentType`, and enhanced `filterDrills` from Tasks 1-2.
- Produces: a cardio category within the strength library, equipment chips in strength mode, and compatible custom-drill/schedule pickers.

- [ ] **Step 1: Write failing interaction tests**

```tsx
await user.click(screen.getByRole("button", { name: "重訓" }));
await user.click(screen.getByRole("button", { name: "啞鈴" }));
expect(screen.getByRole("heading", { name: "啞鈴臥推" })).toBeInTheDocument();
expect(screen.queryByRole("heading", { name: "槓鈴臥推" })).not.toBeInTheDocument();

await user.click(screen.getAllByRole("button", { name: "有氧" })[0]);
expect(screen.getByText("重訓資料庫")).toBeInTheDocument();
expect(screen.getByRole("heading", { name: "跑步" })).toBeInTheDocument();
```

- [ ] **Step 2: Run the app test to verify failure**

Run: `npm test -- --run src/App.test.tsx`

Expected: FAIL because neither the equipment filter nor cardio category exists.

- [ ] **Step 3: Implement filter and domain controls**

Add the cardio category to the strength category list and bilingual copy. Render an equipment chip row only for strength; reset category/equipment when changing domains. Pass the equipment state to `filterDrills`. Let custom drills use the cardio category and default its unit to minutes.

```tsx
const [equipment, setEquipment] = useState<EquipmentType | "all">("all");
const drills = filterDrills(allDrills, { query, domain, category, equipment, favoriteIds: favorites, favoritesOnly: onlyFavorites });
```

Keep chips horizontally scrollable on mobile and visible without overlapping the existing category controls.

- [ ] **Step 4: Run the app test to verify passing**

Run: `npm test -- --run src/App.test.tsx`

Expected: PASS for strength equipment filtering, cardio browsing, and adding drills.

- [ ] **Step 5: Commit the UI slice**

```bash
git add src/App.tsx src/styles.css src/App.test.tsx
git commit -m "feat: filter strength drills by equipment"
```

### Task 4: Run the Complete Verification Suite

**Files:**
- Verify: `src/domain/drills.ts`
- Verify: `src/domain/storage.ts`
- Verify: `src/App.tsx`
- Verify: `src/styles.css`

- [ ] **Step 1: Run all automated tests**

Run: `npm test -- --run`

Expected: all existing and new tests pass.

- [ ] **Step 2: Build the production bundle**

Run: `npm run build`

Expected: TypeScript succeeds and Vite outputs `dist/`.

- [ ] **Step 3: Run source-control checks**

Run: `git diff --check && git status --short`

Expected: no whitespace errors.

- [ ] **Step 4: Perform a browser smoke test**

Open the local Vite server and confirm: boxing and strength tabs render, the cardio category appears under strength, and equipment chips filter correctly, search finds Chinese/English synonyms, and image cards render without layout shifts.


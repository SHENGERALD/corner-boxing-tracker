# Comprehensive Strength Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import a comprehensive bilingual wger exercise catalog into Corner as reviewed static category data, load the full catalog when the Strength library opens, and keep images consistent and mobile-friendly.

**Architecture:** Keep the existing built-in Corner drill IDs and boxing library in the initial bundle. Add a developer-only Node import pipeline that normalizes wger metadata into generated category modules, emits a review report, and records image provenance. A lazy strength-catalog loader imports every category module in parallel only when the library switches to Strength; visible images load lazily with a local fallback.

**Tech Stack:** React 19, TypeScript, Vite 6, Vitest, Testing Library, Node 20+ `fetch`, WebP static assets, wger REST API and CC BY-SA attribution.

## Global Constraints

- Preserve existing drill IDs used by schedules, favorites, records, and custom training items.
- Strength catalog data is static after import; the browser must not call wger at runtime.
- The Strength library must show the complete loaded catalog after entering Strength, not one category at a time.
- Use category-split generated modules and load all of them concurrently only inside the Strength library.
- Include resistance, bodyweight, functional, mobility, stretching, and rehabilitation-style exercises; expose `mobility` as a dedicated category and keep `cardio` separate.
- Every catalog card must have an image; use wger media when usable and a local Corner illustration when no usable wger image exists.
- Keep wger source and CC BY-SA attribution visible in the Strength library.
- Numeric default quantities and units must remain compatible with existing `Drill` and `TrainingUnit` types.
- Use TDD: each behavior gets a failing test before the implementation change, followed by focused tests and the full suite.

---

### Task 1: Extend the domain contract for the mobility category

**Files:**
- Modify: `src/domain/drills.ts`
- Modify: `src/domain/storage.ts`
- Test: `src/domain/drills.test.ts`
- Test: `src/domain/storage.test.ts`

**Interfaces:**
- Consumes: existing `DrillCategory`, `Drill`, and persisted custom-drill validation.
- Produces: `DrillCategory` value `mobility`, category validation that accepts it, and a strength-category list that can be consumed by the library.

- [ ] **Step 1: Write failing domain tests**

Add tests that assert a mobility drill is accepted by `filterDrills` in the Strength domain and that a persisted custom drill with `category: "mobility"` passes state validation.

- [ ] **Step 2: Run focused tests and verify failure**

Run:

```bash
npm test -- --run src/domain/drills.test.ts src/domain/storage.test.ts
```

Expected: TypeScript/test failure because `mobility` is not currently a valid category.

- [ ] **Step 3: Implement the smallest type and validation change**

Add `mobility` to `DrillCategory`, the accepted storage category list, and the exported strength-category list. Do not change existing category IDs or migration behavior.

- [ ] **Step 4: Run focused tests**

Run the same command and expect all focused tests to pass.

- [ ] **Step 5: Commit**

```bash
git add src/domain/drills.ts src/domain/storage.ts src/domain/drills.test.ts src/domain/storage.test.ts
git commit -m "feat: support mobility strength drills"
```

### Task 2: Build the reviewed wger import pipeline

**Files:**
- Create: `scripts/import-wger.mjs`
- Create: `scripts/wger-normalize.mjs`
- Create: `scripts/wger-normalize.test.mjs`
- Create: `scripts/wger-import-report.json`
- Modify: `package.json`

**Interfaces:**
- Consumes: wger public exercise metadata and image references; existing Corner drill metadata from `src/domain/strengthData.ts`.
- Produces: deterministic normalized records with `id`, `domain`, `category`, `name`, `cue`, `defaultUnit`, `defaultQuantity`, `equipment`, `searchTerms`, `imageUrl`, `imageSource`, and `sourceId`; category output consumed by Task 3.

- [ ] **Step 1: Write failing normalization tests**

Cover these exact cases in `scripts/wger-normalize.test.mjs`:

```js
assert.equal(normalizeCategory({ category: "Stretching" }), "mobility");
assert.equal(normalizeEquipment({ equipment: "Dumbbell" }), "dumbbell");
assert.equal(toStableId({ id: 123 }), "wger-123");
assert.equal(isDuplicateMovement(existing, candidate), true);
```

Also assert that an exercise with no usable image is reported in `missingMedia` rather than silently omitted.

- [ ] **Step 2: Run the normalization tests and verify failure**

Run:

```bash
node --test scripts/wger-normalize.test.mjs
```

Expected: FAIL because the normalization module does not exist.

- [ ] **Step 3: Implement normalization and deterministic output**

Implement pure functions for category/equipment normalization, stable IDs, bilingual label fallback, search-term construction, duplicate detection, image URL validation, and review-report collection. Preserve existing Corner IDs through an explicit source-name/ID map. Reject records with no English name, no normalized category, or an invalid default unit.

- [ ] **Step 4: Implement the import command**

`import-wger.mjs` must fetch paginated public exercise data, normalize each page, write category modules under `src/domain/strengthCatalog/`, write `src/domain/strengthCatalog/manifest.ts`, and write `scripts/wger-import-report.json`. It must fail with a nonzero exit code when required metadata is invalid or IDs collide, while still writing the report for review.

- [ ] **Step 5: Add the package command and run it against a saved/reviewable response**

Add:

```json
"import:wger": "node scripts/import-wger.mjs"
```

Run the command, inspect the report for duplicates, missing translations, unknown categories/equipment, invalid image URLs, and missing media, then keep the generated output only when the report is acceptable.

- [ ] **Step 6: Commit the pipeline and generated review artifacts**

```bash
git add scripts package.json src/domain/strengthCatalog
git commit -m "feat: add reviewed wger strength import pipeline"
```

### Task 3: Generate and validate missing Corner exercise images

**Files:**
- Create: `public/assets/strength/generated/` WebP assets for report entries with missing media
- Modify: generated category modules under `src/domain/strengthCatalog/`
- Create: `scripts/validate-strength-media.mjs`
- Create: `scripts/validate-strength-media.test.mjs`

**Interfaces:**
- Consumes: `missingMedia` entries from Task 2 and the approved wger-style visual direction.
- Produces: local image paths and a media validation command consumed by the catalog loader and UI.

- [ ] **Step 1: Write failing media validation tests**

Assert that every strength entry has either a valid local generated path or an external `imageSource: "wger"` URL, and that generated files use WebP paths.

- [ ] **Step 2: Generate missing images in batches**

Generate one neutral white-background exercise illustration per missing action. Each prompt must identify the exact movement and equipment, use a consistent wger-like instructional illustration style, avoid text/logos, and keep the subject centered for the existing circular image area. Optimize the results to WebP and place them under `public/assets/strength/generated/`.

- [ ] **Step 3: Update generated records and run media validation**

Replace only missing-media entries with local paths and `imageSource: "Corner generated"`; leave valid wger image URLs unchanged. Run:

```bash
node --test scripts/validate-strength-media.test.mjs
node scripts/validate-strength-media.mjs
```

Expected: zero missing images, zero invalid paths, and zero duplicate asset IDs.

- [ ] **Step 4: Commit media assets and validation**

```bash
git add public/assets/strength scripts/validate-strength-media.mjs scripts/validate-strength-media.test.mjs src/domain/strengthCatalog
git commit -m "feat: add strength catalog exercise illustrations"
```

### Task 4: Add the code-split strength catalog loader

**Files:**
- Create: `src/domain/strengthCatalog/index.ts`
- Modify: `src/domain/drills.ts`
- Test: `src/domain/drills.test.ts`

**Interfaces:**
- Consumes: generated category modules from Task 2 and images from Task 3.
- Produces: `loadStrengthLibrary(): Promise<Drill[]>` and `strengthCategoryIds` for the UI.

- [ ] **Step 1: Write the failing loader test**

Assert that `loadStrengthLibrary()` resolves all generated category records, includes `mobility`, includes legacy IDs such as `bench-press` and `back-squat`, and contains no duplicate IDs.

- [ ] **Step 2: Implement concurrent category loading**

Use explicit dynamic imports for every generated category module and `Promise.all`. Deduplicate by ID with an assertion that throws if two records claim the same ID. Keep boxing drills synchronously available and remove the unconditional top-level import of the full strength catalog from `src/domain/drills.ts`.

- [ ] **Step 3: Run focused loader tests**

Run:

```bash
npm test -- --run src/domain/drills.test.ts
```

Expected: loader, legacy compatibility, and duplicate checks pass.

- [ ] **Step 4: Commit the loader**

```bash
git add src/domain/strengthCatalog src/domain/drills.ts src/domain/drills.test.ts
git commit -m "feat: lazy load complete strength catalog"
```

### Task 5: Integrate complete Strength loading into the library UI

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: `loadStrengthLibrary()` from Task 4 and existing `filterDrills`/favorite/add callbacks.
- Produces: a Strength library that loads the complete catalog on entry, displays bilingual mobility filters, and preserves current boxing behavior.

- [ ] **Step 1: Write failing UI tests**

Add tests that switch to Strength and wait for a drill from two different categories plus a mobility drill; search in Traditional Chinese and English across categories; and verify a loading state appears before the loader resolves.

- [ ] **Step 2: Add explicit strength catalog state**

Keep `boxing` results immediate. When `domain === "strength"`, call `loadStrengthLibrary()` in an effect, store the result, show a loading state while pending, show a retry button on rejection, and reset the strength error when retrying or returning to Boxing.

- [ ] **Step 3: Add bilingual mobility labels and preserve filters**

Add `活動度／伸展` and `Mobility / Stretching` to both category chip and category rail lists. Keep equipment filtering for resistance drills, reset equipment when switching to cardio or mobility, and leave favorite/add flows unchanged.

- [ ] **Step 4: Verify UI tests**

Run:

```bash
npm test -- --run src/App.test.tsx src/domain/drills.test.ts
```

Expected: complete Strength loading, global search, mobility filtering, existing boxing library, favorites, and add-to-training tests pass.

- [ ] **Step 5: Commit the UI integration**

```bash
git add src/App.tsx src/styles.css src/App.test.tsx
git commit -m "feat: show full strength library on entry"
```

### Task 6: Make strength cards resilient and verify bundle behavior

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Test: `src/App.test.tsx`
- Test: `src/domain/strengthCatalog.test.ts`

**Interfaces:**
- Consumes: loaded catalog entries and image paths from Tasks 3–5.
- Produces: stable card image layout, local fallback behavior, and build-level proof that strength data is not in the initial application chunk.

- [ ] **Step 1: Write failing image behavior tests**

Assert that a visible image uses `loading="lazy"`, an image error switches to the local neutral fallback, and the card keeps its reserved visual height. Assert that generated and wger sources remain distinguishable in the attribution metadata.

- [ ] **Step 2: Implement image fallback and fixed visual slots**

Add `onError` handling that swaps to a local category-neutral fallback and prevents repeated error loops. Keep the existing centered card composition and reserve a stable aspect ratio so loading or failure cannot shift card text and buttons.

- [ ] **Step 3: Add bundle inspection verification**

Build the production app and inspect `dist/assets` to confirm the initial entry chunk does not contain the full generated strength catalog, while strength category chunks exist and are loaded by the strength route/view.

- [ ] **Step 4: Run the complete verification suite**

Run:

```bash
npm test
npm run build
git diff --check
```

Expected: all tests pass, production build succeeds, and only the known Vite chunk-size warning remains if it is still present.

- [ ] **Step 5: Commit the completed feature**

```bash
git add src public scripts package.json docs/superpowers/plans/2026-08-09-comprehensive-strength-library.md
git commit -m "feat: expand strength library with reviewed static catalog"
```

## Handoff Checks

Before publishing, manually verify on a phone-sized viewport:

- Opening the Strength library shows the complete catalog after the loading state.
- The first visible cards show centered images; scrolling loads later images without layout jumps.
- Chinese and English search work across every category.
- Mobility / stretching appears as a strength category and does not mix with cardio.
- Existing favorites, scheduled drills, and historical records still resolve by ID.
- A broken image displays the local fallback and the action can still be added.

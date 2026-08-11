# Strength Localization and Cable Media Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace machine-translated strength-library copy with Taiwan-appropriate Traditional Chinese and give every cable exercise a verified, movement-matched image without losing the corrections on future wger imports.

**Architecture:** Keep generated category modules as import output, but make `reviewedOverrides.json` and `mediaFamilies.json` the authoritative review layer. The importer, runtime catalog loader, and validators all apply or inspect the same reviewed layer; cable records receive a stable `mediaFamilyId` and a local family image. Rule-based terminology normalization handles safe phrases, while source-specific overrides handle ambiguous movements.

**Tech Stack:** React 19, TypeScript 5.7, Vite 6, Vitest 3, Node ESM import scripts, JSON catalog metadata, local WebP/PNG assets.

## Global Constraints

- Preserve all existing Corner drill IDs, scheduled records, favorites, history references, English labels, search behavior, and add-to-training behavior.
- Display cable equipment as `滑輪`; reserve `繩索` for rope attachments.
- Import wger during development only; the product must not request wger at runtime.
- Keep the complete strength catalog code-split and load it only after entering the strength library.
- Every strength record must retain a Traditional Chinese title and cue, a searchable English source name, and valid media.
- Every cable record must have a reviewed `mediaFamilyId` and must not use a generic body-part fallback image.
- New local illustrations use the approved Corner wger-like style: square, warm off-white, charcoal/graphite subject, orange target muscles, full setup visible, no text, logo, watermark, border, or cropped equipment.
- Run the focused catalog tests, full test suite, production build, and mobile preview checks before claiming completion.

---

### Task 1: Add Reviewed Catalog Data Contracts

**Files:**
- Modify: `src/domain/drills.ts`
- Modify: `src/domain/strengthCatalog/index.ts`
- Modify: `src/domain/strengthCatalog/reviewedOverrides.json`
- Create: `src/domain/strengthCatalog/mediaFamilies.json`
- Test: `scripts/validate-strength-media.test.mjs`

**Interfaces:**
- `Drill` gains optional `mediaFamilyId?: string` so reviewed media metadata can be validated and carried through runtime loading.
- `mediaFamilies.json` entries use `{ id: string, label: { zhTW: string, en: string }, imageUrl: string }`.
- `reviewedOverrides.json` remains keyed by stable drill ID and may contain `name`, `cue`, `equipment`, `imageUrl`, `imageSource`, and `mediaFamilyId`.
- `applyReviewedOverrides(drills: Drill[]): Drill[]` remains the public runtime merge function.

- [ ] **Step 1: Write failing schema tests**

Add tests that parse `mediaFamilies.json` and assert every family has a unique non-empty `id`, bilingual labels, and a local `imageUrl`; assert every override key matches `wger-<number>` or an existing Corner drill ID; assert `mediaFamilyId` values point to a declared family.

- [ ] **Step 2: Run the focused test to verify the new assertions fail**

Run: `npm run test:catalog -- --test-name-pattern='reviewed media schema'`

Expected: FAIL because the new family metadata and schema assertions do not exist yet.

- [ ] **Step 3: Add the reviewed metadata shape**

Add `mediaFamilyId?: string` to `Drill`, load `mediaFamilies.json` in the catalog module, and export a small lookup used by validation and runtime. Keep the existing merge order so generated records are merged with the baseline and then reviewed overrides.

- [ ] **Step 4: Run the focused test to verify the shape passes**

Run: `npm run test:catalog`

Expected: Existing catalog tests pass; the new schema test passes with the initial family fixture.

- [ ] **Step 5: Commit**

```bash
git add src/domain/drills.ts src/domain/strengthCatalog/index.ts src/domain/strengthCatalog/reviewedOverrides.json src/domain/strengthCatalog/mediaFamilies.json scripts/validate-strength-media.test.mjs
git commit -m "feat: add reviewed strength media metadata"
```

### Task 2: Build Taiwan Strength Localization Rules

**Files:**
- Create: `scripts/strength-localization.mjs`
- Modify: `scripts/wger-normalize.mjs`
- Modify: `scripts/import-wger.mjs`
- Modify: `scripts/translate-wger.mjs`
- Modify: `src/domain/strengthCatalog/reviewedOverrides.json`
- Create: `scripts/strength-localization.test.mjs`

**Interfaces:**
- Export `normalizeTaiwanTerms(text: string, context?: { equipment?: string, englishName?: string }): string`.
- Export `reviewLocalizedRecord(record, overrides): record`, preserving the English label and search terms.
- Export `findLocalizationIssues(records): Array<{ id: string, field: "name" | "cue", issue: string, value: string }>`.
- The importer applies localization after wger normalization and before generated modules are written.
- The translation script skips an ID when a reviewed override already contains both `name.zhTW` and `cue.zhTW`.

- [ ] **Step 1: Write failing terminology tests**

Cover exact safe mappings and forbidden output:

```js
assert.equal(normalizeTaiwanTerms("Cable Curl"), "滑輪彎舉");
assert.equal(normalizeTaiwanTerms("Cable Fly"), "滑輪飛鳥");
assert.equal(normalizeTaiwanTerms("High Row"), "高位划船");
assert.equal(normalizeTaiwanTerms("Cable Tricep Kickback"), "滑輪三頭肌後踢");
assert.doesNotMatch(normalizeTaiwanTerms("Cable Curls"), /電纜|高排|回扣|飛翼|旋度|拒絕/);
```

Add tests proving an explicit `wger-<id>` override wins over the rule-based result and that English `name.en` and search terms remain unchanged.

- [ ] **Step 2: Run the new localization tests to verify failure**

Run: `node --test scripts/strength-localization.test.mjs`

Expected: FAIL because the localization module and reviewed cases are not implemented.

- [ ] **Step 3: Implement deterministic normalization and explicit overrides**

Use context-aware phrases rather than a blind word-for-word replacement. Map equipment and movement terms such as `Cable -> 滑輪`, `Row -> 划船`, `Pulldown -> 下拉`, `Press -> 推舉/推胸/下壓`, `Curl -> 彎舉`, `Fly/Flye -> 飛鳥`, and grip/stance/laterality modifiers. Add explicit overrides for ambiguous names including Bayesian curl, high row, shotgun row, internal-rotation triceps extension, kickback, and decline/incline cable press. Use natural exercise cues focused on setup, force direction, and control.

- [ ] **Step 4: Protect reviewed copy during translation and import**

Make `translate-wger.mjs` skip fully reviewed IDs, make `wger-normalize.mjs` use the normalized reviewed labels, and make `import-wger.mjs` apply the same override object before serializing each category module. Add a report entry for every remaining untranslated, forbidden, or suspicious mixed-language field instead of silently accepting it.

- [ ] **Step 5: Audit the complete generated catalog**

Run the localization audit against all generated categories, add reviewed overrides until `findLocalizationIssues` reports no forbidden title terms and no missing Traditional Chinese title/cue, then regenerate the category files and `scripts/wger-import-report.json`.

- [ ] **Step 6: Run focused tests and commit**

Run: `node --test scripts/strength-localization.test.mjs scripts/wger-normalize.test.mjs`

Expected: PASS with all safe mappings, explicit overrides, and re-import protection covered.

```bash
git add scripts/strength-localization.mjs scripts/strength-localization.test.mjs scripts/wger-normalize.mjs scripts/import-wger.mjs scripts/translate-wger.mjs src/domain/strengthCatalog/reviewedOverrides.json src/domain/strengthCatalog/generated scripts/wger-import-report.json
git commit -m "feat: localize strength catalog for Taiwan terminology"
```

### Task 3: Define the Cable Movement-Family Taxonomy

**Files:**
- Modify: `src/domain/strengthCatalog/mediaFamilies.json`
- Create: `scripts/audit-strength-cable.mjs`
- Create: `scripts/audit-strength-cable.test.mjs`
- Modify: `src/domain/strengthCatalog/reviewedOverrides.json`

**Interfaces:**
- Export `getCableRecords(records): Drill[]`.
- Export `validateCableFamilyAssignments(records, families): { missingFamily: string[], genericFallback: string[], invalidFamily: string[], duplicateFamilyViolations: string[] }`.
- `mediaFamilyId` is stable and describes movement mechanics, not just body part.

- [ ] **Step 1: Write failing family-assignment tests**

Assert that cable records with distinct force direction, pulley height, stance, laterality, or attachment are not collapsed incorrectly. Include expected family IDs for high/low/horizontal fly, wide/neutral pulldown, seated/single-arm row, bar/rope pushdown, standing/single-arm curl, and Pallof/woodchop.

- [ ] **Step 2: Run the tests to verify failure**

Run: `node --test scripts/audit-strength-cable.test.mjs`

Expected: FAIL with missing cable family assignments.

- [ ] **Step 3: Add the 25–35 family definitions**

Create family IDs covering the approved set: wide and neutral pulldown, seated and single-arm row, high row, straight-arm pulldown, face pull, rear-delt fly, high/horizontal/low chest fly, crossover, single-arm press, bar/rope/single-arm pushdown, overhead extension, kickback, standing/bar/single-arm/Bayesian curl, hammer curl, lateral/front/Y raise, pull-through, hip abduction/adduction, Pallof press, woodchop, and wrist curl. Give each family one local image path and bilingual family label.

- [ ] **Step 4: Assign all 98 cable records**

Use source English name, cue, equipment, stance, attachment, pulley height, direction, and laterality to populate `mediaFamilyId` and reviewed `imageUrl` in `reviewedOverrides.json`. Correct Traditional Chinese names at the same time; use `滑輪` for the machine and `繩索` only when the source or attachment is actually rope.

- [ ] **Step 5: Verify the cable report**

Run the audit and require zero missing family IDs, zero generic body-part fallback paths, zero invalid family IDs, and exactly 98 reviewed cable records.

- [ ] **Step 6: Commit the taxonomy**

```bash
git add src/domain/strengthCatalog/mediaFamilies.json src/domain/strengthCatalog/reviewedOverrides.json scripts/audit-strength-cable.mjs scripts/audit-strength-cable.test.mjs
git commit -m "feat: classify cable exercises by movement family"
```

### Task 4: Create and Attach Reviewed Cable Illustrations

**Files:**
- Create: `public/assets/strength/reviewed/cable/*.webp`
- Modify: `src/domain/strengthCatalog/mediaFamilies.json`
- Modify: `src/domain/strengthCatalog/reviewedOverrides.json`
- Create: `scripts/strength-media-report.json`

**Interfaces:**
- Each family image is square and local; multiple records may reference the same family image only when the setup and mechanics match.
- `imageSource` is `Corner generated` for newly created assets.

- [ ] **Step 1: Generate one image per approved family**

Create the family illustrations in the approved Corner style. Show the athlete, cable tower, pulley height, handle or rope attachment, body position, and movement direction. Keep all important equipment inside the square frame and use orange only for the target muscles.

- [ ] **Step 2: Validate each image file**

Check that every referenced path exists, is square, has a supported image format, and is not a generic category fallback. Produce a contact sheet grouped by family for visual review.

- [ ] **Step 3: Run mobile media checks**

Open the local preview at `http://127.0.0.1:5180/`, enter Strength, inspect cable filters and cards at a 390px viewport, and verify images are centered, not cropped, and visibly distinguish pulley height, attachment, and stance.

- [ ] **Step 4: Commit the reviewed media**

```bash
git add public/assets/strength/reviewed/cable src/domain/strengthCatalog/mediaFamilies.json src/domain/strengthCatalog/reviewedOverrides.json scripts/strength-media-report.json
git commit -m "feat: add reviewed cable exercise illustrations"
```

### Task 5: Make Re-import and Runtime Merging Deterministic

**Files:**
- Modify: `scripts/import-wger.mjs`
- Modify: `src/domain/strengthCatalog/index.ts`
- Modify: `scripts/validate-strength-media.mjs`
- Modify: `scripts/validate-strength-media.test.mjs`
- Create: `scripts/reimport-review-fixture.test.mjs`

**Interfaces:**
- `applyReviewedOverrides` must be the final merge step for runtime records.
- `validateCatalogMedia({ root })` returns existing `missing`, `invalid`, and `reviewedInvalid` arrays plus `cableMissingFamily`, `cableGenericFallback`, `forbiddenLocalization`, and `unknownReviewedIds`.
- A fixture re-import must produce the same reviewed name, cue, equipment, family ID, and image URL as the checked-in catalog.

- [ ] **Step 1: Write the re-import regression test**

Feed a small fixture containing a cable curl, a rope pushdown, a high row, and a non-cable machine exercise through the importer in a temporary output directory. Assert the generated records contain reviewed Traditional Chinese labels and local reviewed media after import, even when the fixture supplies a misleading wger image.

- [ ] **Step 2: Run the regression test to verify failure**

Run: `node --test scripts/reimport-review-fixture.test.mjs`

Expected: FAIL if the fixture output does not preserve the reviewed layer.

- [ ] **Step 3: Refactor import output behind a testable function**

Extract the current generated-record writing path into a function accepting `{ recordsByCategory, reviewedOverrides, outputDir }`. Apply overrides before fallback media assignment and never replace a reviewed local image with a wger URL.

- [ ] **Step 4: Extend validation and runtime tests**

Make catalog validation reject generic cable fallbacks, missing family IDs, invalid local images, forbidden literal titles, missing Chinese cues, unknown override IDs, and duplicate IDs. Ensure the runtime loader still prefixes local URLs with `import.meta.env.BASE_URL` exactly once.

- [ ] **Step 5: Run re-import, catalog, and build checks**

Run: `node --test scripts/reimport-review-fixture.test.mjs scripts/validate-strength-media.test.mjs scripts/wger-normalize.test.mjs && npm run build`

Expected: PASS; the build should retain category code-splitting and no catalog image path should be broken.

- [ ] **Step 6: Commit**

```bash
git add scripts/import-wger.mjs scripts/validate-strength-media.mjs scripts/validate-strength-media.test.mjs scripts/reimport-review-fixture.test.mjs src/domain/strengthCatalog/index.ts src/domain/strengthCatalog/generated
git commit -m "test: preserve reviewed strength catalog on reimport"
```

### Task 6: Correct Equipment Terminology in the Library UI

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/domain/i18n.ts`
- Modify: `src/domain/i18n.test.ts`

**Interfaces:**
- Traditional Chinese equipment filter label for `cable` is `滑輪`.
- English equipment filter label remains `Cable`.
- `rope` is not added as a machine-equipment type; rope is represented by the movement title or attachment-specific metadata.

- [ ] **Step 1: Add a failing bilingual label test**

Assert that `getEquipmentLabel("cable", "zh-TW")` returns `滑輪`, `getEquipmentLabel("cable", "en")` returns `Cable`, and no Traditional Chinese cable label returns `繩索`.

- [ ] **Step 2: Run the focused i18n test to verify failure**

Run: `npm test -- src/domain/i18n.test.ts`

Expected: FAIL until the label source is centralized and updated.

- [ ] **Step 3: Centralize and update the label**

Replace the inline `cable` ternary in `src/App.tsx` with the existing i18n label helper or add the smallest helper matching the local i18n pattern. Keep all other equipment labels unchanged.

- [ ] **Step 4: Verify UI behavior**

Run: `npm test -- src/domain/i18n.test.ts src/App.test.tsx` and inspect the Strength equipment row at the local preview in both language modes.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/domain/i18n.ts src/domain/i18n.test.ts
git commit -m "fix: label cable equipment as pulley in Chinese"
```

### Task 7: Run Full Audit and Handoff Review

**Files:**
- Modify: `scripts/wger-import-report.json`
- Create: `scripts/strength-localization-report.json`
- Create: `scripts/strength-cable-contact-sheet.html`
- Test: `src/domain/strengthCatalog/index.ts`, `scripts/*.test.mjs`, `src/**/*.test.*`

- [ ] **Step 1: Run all automated checks**

Run: `npm run test:catalog && npm test && npm run build`

Expected: Catalog tests, domain/UI tests, and TypeScript/Vite production build pass. Record any pre-existing unrelated test failure separately instead of hiding it.

- [ ] **Step 2: Run the final localization and cable audits**

Run the localization and cable audit scripts and require: 831 records checked, zero forbidden literal title terms, zero missing Traditional Chinese title/cue, 98 cable records checked, zero generic cable fallback images, zero missing/invalid family IDs, and zero missing local media.

- [ ] **Step 3: Inspect desktop and mobile behavior**

At `http://127.0.0.1:5180/`, verify Strength entry loads the complete catalog, Chinese and English search both find cable records, body-part and equipment filters compose, favorites still work, and adding a reviewed cable movement to Today preserves its ID and image. Repeat at a narrow phone viewport and inspect image cropping.

- [ ] **Step 4: Commit the audit artifacts**

```bash
git add scripts/wger-import-report.json scripts/strength-localization-report.json scripts/strength-cable-contact-sheet.html
git commit -m "chore: record strength catalog audit results"
```

- [ ] **Step 5: Report remaining risk clearly**

Summarize the number of reviewed records and families, test/build results, image review result, and any pre-existing unrelated failures. Do not claim the audit is complete until the numerical acceptance criteria and mobile spot checks are evidenced.

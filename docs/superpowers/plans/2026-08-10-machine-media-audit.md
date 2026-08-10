# Strength Machine Media Audit Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

Goal: Correct strength-library equipment inference and reviewed machine imagery so machine, Smith, leverage, plate-loaded, and Hammer Strength exercises show the correct filter and movement-specific icon.

Architecture: Keep the existing Drill interface and generated wger chunks. Store reviewed wger corrections in one JSON registry consumed by both the import script and the runtime loader. Store new Corner-generated images under a stable local asset directory, with explicit image URLs in the registry. Use tests to lock classification, override application, local media, and duplicate-id behavior.

Tech Stack: React, TypeScript, Vite, Vitest, Node ESM import scripts, local PNG/WebP assets.

## Global Constraints

- Preserve existing persisted drill ids and the Drill / EquipmentType interfaces.
- Keep wger attribution for wger media and do not add manufacturer logos.
- Use hammer for plate-loaded / leverage equipment and machine for selectorized or fixed-path equipment.
- Every reviewed machine / plate-loaded record must resolve to movement-specific media, not a generic body-part fallback.
- Use the approved Corner charcoal, off-white, and orange instructional illustration style.
- Keep generated wger category files reproducible; do not hand-edit them as the source of truth.

---

### Task 1: Lock equipment inference with regression tests

Files:
- Modify: scripts/wger-normalize.test.mjs
- Modify: scripts/wger-normalize.mjs

Interfaces:
- normalizeEquipment(input) remains the public normalizer.
- Reviewed name inference remains inside normalizeEquipment and returns an existing EquipmentType value.

- [ ] Step 1: Add failing tests for bench and machine-name cases

Add cases proving:

    assert.equal(normalizeEquipment({ equipment: [{ name: "Bench" }], name: "Dumbbell Bench Press" }), "bodyweight");
    assert.equal(normalizeEquipment({ equipment: [{ name: "None" }], name: "Leverage Machine Iso Row" }), "hammer");
    assert.equal(normalizeEquipment({ equipment: [{ name: "None" }], name: "Pendulum Squat" }), "hammer");
    assert.equal(normalizeEquipment({ equipment: [{ name: "None" }], name: "Smith Machine Press" }), "machine");
    assert.equal(normalizeEquipment({ equipment: [{ name: "None" }], name: "Biceps Curl Machine" }), "machine");

- [ ] Step 2: Run the focused test and verify the expected failures

Run:

    npm run test:catalog -- scripts/wger-normalize.test.mjs

Expected: the new assertions fail because the current normalizer maps any bench to machine and ignores movement-name inference.

- [ ] Step 3: Implement the smallest normalizer change

In scripts/wger-normalize.mjs, remove the broad bench-to-machine equipment rule. Build normalized name text from the exercise name, category, and translation names, then apply only unambiguous terms:

    const HAMMER_NAME_TERMS = /plate.?loaded|leverage machine|hammer.?strength|hammer machine|pendulum squat|hack squat machine/i;
    const MACHINE_NAME_TERMS = /smith machine|multipress|machine|selectorized|pullover machine|assisted pull.?up/i;

Apply explicit equipment metadata first, then name inference only when metadata is none or absent. Preserve the existing fallback to bodyweight.

- [ ] Step 4: Run the focused test and verify it passes

Run the same command. Expected: all normalizer tests pass, including the new cases.

- [ ] Step 5: Commit the normalization fix

    git add scripts/wger-normalize.mjs scripts/wger-normalize.test.mjs
    git commit -m "fix: infer machine equipment from movement names"

### Task 2: Add a shared reviewed override registry

Files:
- Create: src/domain/strengthCatalog/reviewedOverrides.json
- Modify: scripts/import-wger.mjs
- Modify: src/domain/strengthCatalog/index.ts
- Create: src/domain/strengthCatalog/reviewedOverrides.test.ts
- Modify: src/domain/drills.test.ts

Interfaces:
- reviewedOverrides.json maps stable wger ids to equipment, optional bilingual labels/cues, and a local imageUrl.
- Runtime helper applyReviewedOverrides(drills: Drill[]): Drill[] returns new records without mutating generated modules.
- Import helper applies the same JSON values before category files are written.

- [ ] Step 1: Add failing runtime tests for reviewed records

Assert that the loaded catalog includes reviewed records such as wger-379 as hammer, wger-380 as hammer, wger-1414 as hammer, wger-1424 as machine, and wger-543 as machine. Assert that their image URLs are local and do not contain the generic generated category path.

- [ ] Step 2: Create the override registry

Add stable entries for the confirmed machine-family records whose current metadata or image is wrong. Each entry must include the reviewed equipment and a stable local asset path. The registry must cover the confirmed generic-fallback records in chest, back, legs, shoulders, arms, and core, including leverage chest press, leverage iso row, pullover machine, hack squat, pendulum squat, machine lateral raise, machine shoulder press, biceps curl machine, triceps machine, machine crunch, and rotary torso machine.

- [ ] Step 3: Implement runtime override application

Import the JSON registry in src/domain/strengthCatalog/index.ts. Merge each matching override after baseline and generated records are combined, preserving all unrelated fields and adding imageSource: "Corner generated" for local reviewed images. Keep the existing duplicate-id guard after overrides.

- [ ] Step 4: Apply the same registry during wger import

Load src/domain/strengthCatalog/reviewedOverrides.json from scripts/import-wger.mjs and pass the overrides into the generated record transformation before category sorting and writing. This prevents a future import from restoring generic images or wrong equipment.

- [ ] Step 5: Run focused runtime tests

Run:

    npm test -- src/domain/drills.test.ts

Expected: reviewed machine records load, filters keep hammer and machine separate, and all existing strength tests remain green.

- [ ] Step 6: Commit the registry and runtime/import integration

    git add src/domain/strengthCatalog/reviewedOverrides.json src/domain/strengthCatalog/index.ts src/domain/strengthCatalog/reviewedOverrides.test.ts src/domain/drills.test.ts scripts/import-wger.mjs
    git commit -m "feat: add reviewed strength media overrides"

### Task 3: Replace reviewed machine fallback imagery with Corner icons

Files:
- Create: public/assets/strength/reviewed/*.png
- Modify: src/domain/strengthCatalog/reviewedOverrides.json
- Modify: scripts/validate-strength-media.mjs
- Modify: scripts/validate-strength-media.test.mjs

Interfaces:
- Each reviewed asset is a square raster illustration named after its stable drill id.
- The registry points directly to /assets/strength/reviewed/<id>.png.
- Media validation distinguishes reviewed local images from generic category fallback images.

- [ ] Step 1: Add a failing media validation assertion

Extend the validator test to reject a reviewed record whose image URL contains the generic generated category path, and to require every override image path to exist under public.

- [ ] Step 2: Generate movement-specific assets

Generate one image per reviewed movement using the approved visual direction: full machine and athlete, readable setup, target muscles in Corner orange, charcoal/off-white instructional illustration, no logos, no text, and consistent square framing. Copy each selected generated asset into public/assets/strength/reviewed/ with the stable id filename, then update the registry paths.

- [ ] Step 3: Run the media validator

Run:

    npm run test:catalog

Expected: no missing or invalid generated media, no missing bilingual title/cue, and no reviewed record uses a generic category image.

- [ ] Step 4: Commit the reviewed assets

    git add public/assets/strength/reviewed src/domain/strengthCatalog/reviewedOverrides.json scripts/validate-strength-media.mjs scripts/validate-strength-media.test.mjs
    git commit -m "feat: add movement-specific machine exercise icons"

### Task 4: Verify library behavior and production output

Files:
- Modify: src/domain/drills.test.ts if a regression case is discovered
- Modify: src/styles.css only if image framing needs a small responsive correction

Interfaces:
- No public data interface changes.
- Existing strength-library loading and filter controls remain the integration boundary.

- [ ] Step 1: Run the full test suite

    npm test

Expected: zero failed tests across domain, component, and catalog behavior.

- [ ] Step 2: Build the production bundle

    npm run build

Expected: TypeScript and Vite both exit with code 0.

- [ ] Step 3: Verify the local library

Start the existing dev server on an available port, open the strength library, select 悍馬 and 器材, search plate-loaded and leverage, and confirm every reviewed card shows its own movement-specific icon without horizontal overflow on a phone viewport.

- [ ] Step 4: Review the final diff and commit any verification-only correction

    git diff --check
    git status --short
    git log -6 --oneline

Only make a final correction commit if a verified regression requires it.

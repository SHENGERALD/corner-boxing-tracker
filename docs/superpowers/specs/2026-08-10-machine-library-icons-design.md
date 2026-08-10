# Plate-Loaded and Machine Exercise Library Design

**Status:** Approved direction, pending written-spec review

## Goal

Expand the strength library with a useful, searchable set of plate-loaded / leverage and fixed-path machine exercises, including Hammer Strength and comparable equipment from other brands. Give each newly added exercise a unique Corner instructional icon that matches the approved charcoal, off-white, and orange visual style.

## Scope

- Add common plate-loaded / leverage movements across chest, back, legs, shoulders, and arms.
- Audit existing strength records whose names or aliases identify machine, Smith, multi-press, hack-squat, pendulum-squat, leverage, or plate-loaded equipment.
- Correct confirmed equipment misclassification before adding new records.
- Replace the generic body-part fallback for every confirmed machine / plate-loaded record in this phase with either a verified movement-specific wger image or a dedicated Corner image.
- Treat Hammer Strength as one brand example, not as the only accepted brand.
- Keep selectorized / pin-loaded and fixed-path machines under the existing `machine` equipment filter.
- Keep plate-loaded / leverage movements under the existing `hammer` equipment filter so the current UI remains compatible.
- Add Chinese and English names, concise cues, search aliases, default unit, and default quantity for every new exercise.
- Give every newly added exercise a dedicated local image asset. Do not use the generic body-part fallback for these records.
- Preserve the existing wger catalog, its attribution, and existing persisted drill IDs.

## Data Model

Keep the existing `Drill` and `EquipmentType` interfaces unchanged. Add curated records in a dedicated generated/static module so imported wger files remain reproducible and the new catalog can be reviewed separately.

Each curated record must include:

```ts
{
  id: string;
  domain: "strength";
  category: "chest" | "back" | "legs" | "shoulders" | "arms";
  name: { zhTW: string; en: string };
  cue: { zhTW: string; en: string };
  defaultUnit: "rounds";
  defaultQuantity: 3;
  equipment: "hammer" | "machine";
  imageUrl: string;
  imageSource: "Corner generated";
  searchTerms: string[];
}
```

Ids are stable kebab-case values and must not collide with legacy or wger ids. Search terms include the movement name, Chinese aliases, and relevant equipment aliases such as `plate loaded`, `plate-loaded`, `leverage`, `悍馬`, and `片掛式` where applicable.

Existing wger records keep their stable ids. Corrections are stored as explicit reviewed overrides keyed by id rather than hand-editing generated category files. The same corrections must be applied by the import pipeline so a future wger import cannot reintroduce the problem.

## Audit Findings

The current generated catalog contains 831 strength records. Of those, 579 use one of nine generic category images instead of movement-specific media. The current equipment normalizer also has two conflicting behaviors:

- it maps any equipment name containing `bench` to `machine`, producing false positives for bodyweight and free-weight bench movements;
- it does not consider movement names such as `Leverage Machine Iso Row`, `Pendulum Squat`, or `Smith Machine Press`, producing false `bodyweight` values when wger equipment metadata is incomplete.

The fix must remove the broad `bench -> machine` rule and add reviewed movement-name inference for machine families. Name inference is allowed only for specific unambiguous terms such as `machine`, `smith machine`, `multipress`, `hack squat machine`, `pendulum squat`, `plate-loaded`, `leverage machine`, and `hammerstrength`.

## Initial Curated Set

The first batch should cover these movement patterns without duplicating the existing legacy records:

- Chest: plate-loaded chest press, incline press, decline press, converging press, and leverage fly.
- Back: plate-loaded row, high row, iso-lateral pulldown, leverage pullover, and machine-supported row.
- Legs: 45-degree leg press, hack squat, pendulum squat, belt squat, hip thrust, and leverage calf raise.
- Shoulders: plate-loaded shoulder press, machine lateral raise, rear-delt machine, and leverage shrug.
- Arms: machine preacher curl, machine biceps curl, machine triceps extension, and assisted dip.

Names should describe the movement first and avoid claiming a specific brand in the main English title unless the exercise is genuinely brand-specific. Brand aliases can live in `searchTerms`.

## Image Direction

Use the approved icon direction shown in the visual companion:

- full machine and athlete visible
- movement setup readable at small card size
- target area highlighted with Corner orange
- charcoal and off-white instructional illustration
- warm neutral background with no brand logos
- one local image per movement, centered with consistent padding and aspect ratio

The image filename must be derived from the stable exercise id. The UI may continue to use the existing `imageUrl` field, so no card component redesign is required for this phase.

For existing wger media, keep an external image only after confirming that it depicts the same movement and equipment. A generic category image or an image depicting a different press, row, or stance is not considered valid media for a reviewed machine record.

## Loading and Filtering

Load curated machine records through the same strength-library loader used by the existing category chunks. The machine records must appear immediately when the strength library is opened after its chunk resolves and must participate in the current category and equipment filters.

The existing labels remain:

- `悍馬` / `Hammer` for `hammer`
- `器材` / `Machine` for `machine`

No new top-level category is introduced in this phase. Users find the new exercises by body part, equipment filter, or search.

## Validation

Add tests that prove:

1. The curated records load with the strength catalog.
2. Every curated record has a unique id, bilingual name and cue, a valid equipment value, and a local image path.
3. Plate-loaded and leverage aliases return the expected records through the existing search function.
4. `hammer` and `machine` filters do not mix the two equipment types.
5. Existing wger and legacy records still load without duplicate ids.
6. Production build succeeds and the local image validation script reports no missing or invalid curated media.
7. Bench-only equipment is not automatically classified as `machine`.
8. Unambiguous Smith, leverage, Hammer Strength, pendulum, and machine movement names receive the reviewed equipment type.
9. Every reviewed machine / plate-loaded id resolves to movement-specific media rather than a generic category fallback.

## Out of Scope for This Phase

- Replacing every existing wger image outside the reviewed machine / plate-loaded set in the 800-plus exercise catalog.
- Adding brand logos or manufacturer-specific product claims.
- Creating a new backend table for the curated catalog.
- Changing the persisted `Drill` interface or user-created drill format.

The existing catalog can be migrated in later batches using the same per-exercise image contract after reviewing image quality and storage size.

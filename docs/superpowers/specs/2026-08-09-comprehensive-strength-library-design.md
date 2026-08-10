# Comprehensive Strength Library Design

## Goal

Expand Corner's built-in strength library from its current curated set into a
comprehensive, bilingual static catalog sourced from wger. The catalog remains
fast on phones, works after it has loaded without an API request, and preserves
all existing scheduled and recorded drill IDs.

## Product Decisions

- Use a developer-run import script, not live wger requests in the product.
- Import the complete eligible resistance, bodyweight, functional, mobility,
  stretching, and rehabilitation-style exercise catalog.
- Add `mobility` as a dedicated strength-library category. Keep cardio as its
  existing dedicated category.
- Entering the strength library loads every strength catalog category in
  parallel so the complete catalog, filters, and search results are available
  immediately in that view.
- Keep category source files separate so the rest of the app does not download
  the strength catalog until the user opens the strength library.
- Show images on visible cards and lazy-load images below the viewport. Every
  card has an image: use verified wger media when present and a local,
  wger-style Corner exercise illustration only when wger has no usable image.
- Keep wger source and CC BY-SA attribution visible in the strength library.

## Catalog Shape

Each imported exercise has a stable `wger-<source-id>` ID unless it maps to an
existing Corner ID. Existing IDs, including `bench-press`, `barbell-row`, and
`back-squat`, are retained unchanged.

Each catalog entry includes:

- bilingual name (`zhTW`, `en`)
- category and supported equipment
- source ID and attribution metadata
- original and normalized search terms
- default logging unit and quantity
- image URL or local generated-image path

The existing body-part categories remain chest, back, legs, shoulders, arms,
core, and calves. Add mobility alongside the existing cardio category. Imported
exercise categories are normalized to one of these app categories before they
can enter the catalog.

## Loading and Search

The application code-splits catalog data by category. It loads no comprehensive
catalog data during normal Today, Schedule, History, Backup, or boxing-library
use. When the user selects Strength in the library, the app imports every
category data module concurrently and renders the full result list.

All loaded entries are held in the library view's state and filtered locally by
query, category, equipment, and favorites. This means a search such as `squat`,
`深蹲`, `dumbbell`, or `肩` always searches the complete strength catalog after
the strength library opens. Cards reserve a fixed image area and use browser
lazy image loading to prevent below-the-fold media from delaying interaction.

## Import and Review Workflow

The developer-only import command fetches wger public exercise metadata and
media references, then emits category data modules plus a review report. It
does not modify the catalog automatically without review.

The report lists duplicate movement candidates, unknown categories or equipment,
missing English names, missing Traditional Chinese names, invalid image URLs,
and the entries that require a Corner illustration. Import output fails
validation if IDs collide, a normalized category is invalid, or required
bilingual/search metadata is missing.

Corner-generated illustrations are optimized WebP assets with the same neutral
white-background, anatomical or equipment-focused visual language as the
existing wger imagery. They are only produced for entries lacking a usable wger
image.

## Compatibility and Errors

Legacy built-in IDs remain stable. New imported IDs are deterministic from the
wger source ID, so favorites, plans, and historical records can safely refer to
them after later catalog updates. If a catalog image fails to load, the card
shows a local neutral fallback without changing the action name or blocking
adding it to a workout.

The strength-library view shows a compact loading state while all category data
is loading, a retry affordance if a code-split request fails, and its normal
empty state only when filters return no matches.

## Verification

- Import validation tests cover duplicate IDs, category/equipment normalization,
  required bilingual fields, and missing-media reporting.
- Library tests verify every category is present after opening Strength, global
  Chinese and English search work across categories, and existing legacy IDs
  remain unchanged.
- UI tests verify category/equipment/favorite filters still compose correctly,
  visible cards display an image, and a failed image uses the fallback.
- Production build inspection verifies that comprehensive strength data is
  excluded from the initial app chunk and requested only after entering the
  strength library.

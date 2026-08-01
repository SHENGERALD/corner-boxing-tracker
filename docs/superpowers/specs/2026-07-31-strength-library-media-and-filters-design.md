# Strength Library Media and Filters Design

## Goal

Make the strength library easy to browse without duplicate exercises: retain
stable existing drill IDs, enrich every retained strength drill with a wger
reference image, and filter drills by body part and equipment.

## Data

- Keep existing strength drill IDs so scheduled drills and history continue to
  resolve correctly.
- Remove newly-added wger drills that duplicate an existing exercise.
- Keep only non-duplicate wger additions.
- Expand the resulting library to approximately 50-70 common gym exercises,
  balanced across body parts and the supported equipment types.
- Extend each strength drill with an equipment classification: barbell,
  dumbbell, kettlebell, cable, hammer, machine, or bodyweight.
- Give every remaining strength drill a verified wger image URL. If wger has
  no direct equivalent, the drill is excluded rather than shown without an
  image.

## Cardio Category Within Strength

- Add cardio as a dedicated category inside the strength library, not a third training domain.
- Include common cardio activities: running, cycling, rowing machine, jump rope,
  stair climber, swimming, and interval conditioning.
- Default cardio logging uses minutes so it works with the existing set logger.

## Library Interaction

- The current body-part selector remains the first filter.
- Add an equipment chip row below it: All, Barbell, Dumbbell, Kettlebell,
  Cable, Hammer, Machine, and Bodyweight.
- Apply both filters together. "All" in either filter leaves the other filter
  active.
- Cards retain their existing add-to-today behavior and show the linked image.

## Search

- Search across Traditional Chinese and English names, body-part labels, equipment
  labels, and a compact synonym list for common terms such as bench press,
  dumbbell, back, bodyweight, and pull-up.
- Normalize case and whitespace before matching.
- Rank exact name matches before partial-name and metadata matches.
- Apply the active body-part and equipment filters to search results.

## Safety and Verification

- Images are shown directly from wger with the existing source attribution.
- Validate every selected remote image before adding it.
- Add tests for combined body-part and equipment filtering, plus the absence of
  duplicated exercises.

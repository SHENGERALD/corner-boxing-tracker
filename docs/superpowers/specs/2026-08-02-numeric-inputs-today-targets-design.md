# Numeric Inputs and Today Target Overrides

## Goal

Make every numeric field editable without forcing a fallback value while the user is typing, and let users change a planned drill's rounds or minutes for the selected day without changing the weekly schedule.

## Numeric Input Behavior

- Numeric fields keep a local draft string while focused.
- An empty string is a valid temporary editing state.
- Validation and clamping happen on blur or when the containing action is submitted.
- Required positive values fall back to their minimum only when committed.
- Optional set weight and repetition fields continue to save an empty value as `undefined`.
- Apply this behavior to timer settings, drill quantities, custom drill defaults, schedule duration, and preview numeric fields. Range and select controls are unchanged.

## Today Target Overrides

Extend `TrainingRecord` with an optional map keyed by planned item ID:

```ts
itemTargetOverrides?: Record<string, {
  quantity: number;
  unit: "rounds" | "minutes";
}>;
```

This map belongs to one date record, so changing Shadow Boxing from 3 to 5 rounds affects only that date. The weekly plan and its snapshot remain unchanged.

Custom items already belong to the date record. Editing their target updates the existing `quantity` and `unit` fields instead of creating an override.

## Today UI

- Place a compact `Today's target` editor above the set logger inside each expanded training entry.
- Use minus and plus icon buttons around a numeric input for fast mobile operation.
- Show the current unit beside the input. Round-based and minute-based items retain their unit.
- The input can be cleared and replaced with a multi-digit value.
- The collapsed item summary displays the overridden target when one exists.
- Only items with a recognizable round or minute target receive this editor. Strength details such as `4 x 6-8` continue to use set logging.

## Data Flow

1. Parse the planned item's default round or minute target from its localized detail.
2. Prefer the date record override when rendering Today.
3. Save edits through the existing `updateRecord` path so `updatedAt`, local persistence, cloud merging, and realtime sync continue to work.
4. Use the override in boxing-load and training-minute calculations so History reflects the performed target.

## Compatibility and Validation

- Update storage validation to accept the optional override map and reject invalid quantities or units.
- Existing records without overrides decode unchanged.
- Removing a planned item also removes its target override.
- Clearing the entire date record removes all overrides with the record.

## Tests

- Every affected numeric input can be cleared and replaced with a multi-digit number.
- A Today target change updates the visible detail and persists after remount.
- The same weekday in a later week still uses the original weekly plan target.
- Custom-item target edits update only that date's item.
- History/load calculations use the overridden value.
- Storage decode accepts valid overrides and rejects malformed overrides.

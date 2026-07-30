# Calendar and Boxing Drill Library Design

## Goal

Evolve Corner from a simple weekly checklist into a personal boxing log: a calendar-based record of training plus a searchable drill library. Keep the calm, private product character defined in the original design, while applying the visual language of the supplied reference: dark surfaces, muted text, restrained green status accents, compact rounded controls, and dense but readable training information.

This is inspired by the reference's interaction patterns only. Corner remains a distinct boxing-specific interface and does not copy its branding, layout, or imagery.

## Information Architecture

- **Today** remains the opening screen and the fastest way to complete planned and custom work.
- **Week** becomes a monthly calendar log. The view has month navigation, a seven-column grid, completion indicators, total rounds/minutes, and up to two compact drill labels per recorded date. Selecting a date opens Today for that date.
- **Log** becomes **Drill Library**. It contains all available boxing drills, a search field, category filters, a favorites filter, and drill cards.
- **Backup** retains language, export/import, and reset controls.

The bottom navigation keeps four destinations; only the meaning and UI of Week and Log change.

## Visual Direction

- Default to a charcoal-black background with charcoal cards, off-white type, softened gray secondary text, and one muted green accent.
- Use green only for active navigation, selected states, complete status, add actions, and tags. Do not use it decoratively throughout the screen.
- Keep Steady's low-friction, private-log feeling: clear hierarchy, minimal chrome, no streaks, badges, leaderboards, or social mechanics.
- On mobile, use a rounded floating bottom bar. On larger screens, preserve the same visual density with a wider content column.
- Use CSS icons and text labels rather than copying screenshots or external exercise images. Each drill card uses a category mark and practical metadata, avoiding medical or coaching claims.

## Drill Library

### Initial categories

1. **Fundamentals:** stance, guard, skipping, shadow boxing.
2. **Footwork:** step forward/back, lateral slide, pivot, angle exit.
3. **Offense:** jab, cross, hook, uppercut, 1-2, 1-2-3, body-head combination.
4. **Defense:** high guard, parry, inside/outside slip, roll, pull-back, punch-and-return.
5. **Equipment drills:** heavy-bag technique round, double-end bag, slip rope, padwork, reaction drill.
6. **Conditioning and recovery:** boxing core circuit, Zone 2 run, round intervals, mobility cooldown.

The initial data set will contain about 30 entries. Every entry has Traditional Chinese and English names, a category, a concise coaching cue, a default unit (rounds or minutes), a default quantity, and a beginner/advanced safety tag where relevant. Sparring is not included as a directly schedulable beginner drill; it remains in the existing 12-week plan's coach-led later phase.

### Library interactions

- Search matches Traditional Chinese and English drill names.
- Category chips filter the visible cards.
- Tapping the favorite control persists the drill ID locally and provides a Favorites filter.
- The add control opens a compact panel for date, quantity, unit, and optional note. It defaults to the currently selected Today date and the drill's recommended unit/quantity.
- Confirming adds a **custom training item** to that date's record immediately. It is visible and completable in Today, appears in Week totals and labels, and is preserved by export/import.

## Data Model

The current `TrainingRecord` gains `customItems`:

- `id`: generated client-side ID.
- `drillId`: source drill ID.
- `quantity`: positive number.
- `unit`: `rounds` or `minutes`.
- `note`: optional short text.
- `completed`: boolean.

`AppState` gains `favoriteDrillIds: string[]`. Existing records remain valid: missing `customItems` and missing favorites are treated as empty arrays during load/import. The backup version will be migrated to version 2 while still accepting valid version 1 backups.

## Calendar Rules

- Month view starts on Monday and displays preceding/following dates in muted text.
- A date's completed state is calculated from planned checklist items and any custom items. Rest dates without custom work remain neutral.
- The date cell prioritizes a total (e.g. `4R`, `30m`, or `4R · 30m`) and then one or two drill labels. It does not attempt to render every item in a small cell.
- Month navigation changes the displayed month without overwriting the selected Today date until the user taps a date.

## Error Handling and Accessibility

- A malformed or obsolete backup must not overwrite local data. Valid v1 data is migrated to v2 in memory before saving.
- Empty search/filter states explain that no drills match and preserve access to all drills.
- Dialog fields have visible labels, keyboard focus, Escape/Cancel paths, and an explicit confirmation action.
- All drill cards, favorite controls, calendar dates, and add controls have accessible names. The interface must remain usable at 320px width.

## Testing

- Domain tests cover v1-to-v2 migration, custom item totals, favorites, and calendar-week calculation.
- UI tests cover searching/filtering drills, favoriting, adding an item to a selected date, and the item's persistence after remount.
- Build and complete test suite run before handoff.

## Explicit Non-Goals

- No user-created drill definitions in this iteration.
- No video hosting, exercise illustrations, coach messaging, cloud sync, sharing, or social activity.
- No automatic load/weight tracking or body-part anatomy model.
- No substitute for in-person coaching; the library is a structured log and cue reference.

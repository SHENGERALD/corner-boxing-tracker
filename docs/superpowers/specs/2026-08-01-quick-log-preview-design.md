# Quick Log Preview Design

## Purpose

Provide an isolated mobile-first prototype at `?preview=quick-log` to compare a lower-friction training-recording flow without changing the production Today view or persisted training records.

## Entry and isolation

- The preview is selected only by the query parameter `preview=quick-log`.
- It is not added to the production navigation.
- It uses in-memory demonstration data only and does not call localStorage, Supabase, or existing record update handlers.
- Visiting the normal URL continues to render the current application unchanged.

## Prototype flow

### Boxing and cardio

- Each drill shows its preset quantity and unit.
- A single large completion control marks the drill done.
- A compact More control reveals optional notes and an editable quantity; it does not launch another modal.

### Strength

- A strength drill initially displays one set with a weight and rep field.
- Adding a set duplicates the previous set values.
- Completing a set is a single tap.
- The user can adjust weight and reps inline before or after completion.

### Exit behavior

- The preview does not need an activity modal for normal logging.
- Any optional details sheet supports Escape, a visible close control, and backdrop click.

## Success criteria

- Boxing or cardio can be recorded in one tap.
- A subsequent strength set can be added and completed with no quantity picker or duration picker modal.
- The prototype renders cleanly at a 390 px mobile width and does not create horizontal scrolling.
- Existing Today behavior and persisted state remain unchanged.

## Verification

- Add a focused App test that the query parameter renders the preview and that a boxing completion updates only preview UI.
- Run the full test suite and production build before presenting the URL.

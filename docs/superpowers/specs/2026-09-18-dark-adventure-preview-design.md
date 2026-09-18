# Dark Adventure Preview Design

## Goal

Add a mobile-first, playable dark-fantasy training adventure preview to Corner. It should demonstrate how completed training can damage enemies and advance a ten-floor tower without changing production training records, cloud synchronization, or account data.

## Scope

The preview contains one player, ten floors, normal enemies, and bosses on floors 5 and 10. A small entry card appears on Today and opens a full-screen adventure panel. A demonstration training action advances combat so the user can judge the visual direction and pacing.

This version does not include equipment, currency, skill trees, rankings, shops, multiplayer, character creation, or rewards that affect training behavior.

## Experience

The Today entry shows the current floor, enemy name, and remaining health. Opening it reveals:

- a dark tower scene with the current enemy as the visual focus;
- player level, experience, floor, and enemy health;
- one primary demonstration action representing a completed workout;
- brief damage, enemy defeat, experience gain, level-up, and floor transition feedback;
- a reset control clearly labeled as preview-only.

Resting or inactivity never removes health, experience, levels, or progress. The interface does not create urgency, streak loss, or punishment for missed training.

## Progression Rules

The preview uses deterministic sample values rather than production workout calculations. Each demonstration action deals a fixed amount of damage. Defeating an enemy grants experience and moves to the next floor. Experience thresholds are simple and predictable. Floor 10 ends in a completed-tower state that can be reset.

These rules live in a small pure domain module so future workout-based calculations can replace the sample action without rewriting the interface.

## State Isolation

Preview state is stored under a separate localStorage key. It is not added to `AppState`, included in backups, merged by `cloud.ts`, or uploaded to Supabase. Invalid stored preview data falls back to the initial state.

The entry and panel may be removed later without requiring an application-state migration.

## Components

- `src/domain/adventure.ts`: state types, floor definitions, progression, reset, and validation.
- `src/components/AdventurePreview.tsx`: Today entry card and full-screen adventure panel.
- `src/App.tsx`: opens and closes the preview; no training-record mutation.
- `src/styles.css`: responsive scene, combat feedback, and reduced-motion behavior.

Visual assets should be CSS-led or use lightweight local assets already appropriate to the Corner brand. The first version must not depend on remote images.

## Accessibility And Mobile Behavior

The panel fits narrow iPhone viewports without horizontal scrolling. Controls have at least 44px touch targets. The panel closes through its close button, Escape, and backdrop interaction. Status changes are announced without forcing focus. `prefers-reduced-motion` removes combat movement while preserving state feedback.

Chinese and English strings are both provided. The preview follows the application's current language immediately.

## Testing

Unit tests cover damage, enemy defeat, floor advancement, level-up, final-floor completion, reset, and invalid local data. UI tests cover opening from Today, running a demonstration attack, persistence after remount, reset, closing interactions, bilingual labels, and the absence of AppState/cloud mutations.

Build, complete unit/UI tests, and a mobile viewport inspection are required before completion. The preview remains local until the user explicitly requests a GitHub upload.

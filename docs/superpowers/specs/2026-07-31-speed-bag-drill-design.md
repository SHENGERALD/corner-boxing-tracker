# Speed Bag Drill Design

## Scope

Add Speed Bag as a built-in boxing drill. Do not change the default weekly schedule.

## Drill Definition

- ID: `speed-bag`
- Domain: `boxing`
- Category: `equipment`
- Traditional Chinese name: `速度球`
- English name: `Speed Bag`
- Traditional Chinese cue: `放鬆肩膀，維持穩定節奏`
- English cue: `Relax shoulders, keep a steady rhythm`
- Default unit: `rounds`
- Default quantity: `3`

## Behavior

The drill appears in the boxing database under Equipment. Users can find it by searching either `速度球` or `Speed Bag`, favorite it, and add it to today or a weekly schedule through the existing drill-library flow.

## Testing

Extend the drill-domain tests to verify that Speed Bag is a boxing equipment drill with a three-round default and is discoverable by its English name. Existing filter and application tests must remain green.

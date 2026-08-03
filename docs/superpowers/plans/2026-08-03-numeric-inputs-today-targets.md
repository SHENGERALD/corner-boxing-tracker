# Numeric Inputs and Today Target Overrides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow every numeric field to be cleared while editing and let users override planned rounds or minutes for one date directly from Today.

**Architecture:** Add a reusable draft-number input that commits validated numbers on blur or submit. Store planned-item changes in a date-scoped `TrainingRecord.itemTargetOverrides` map, while custom items continue using their existing date-scoped `quantity` and `unit`. A small target parser and formatter provide one source of truth for Today rendering and History calculations.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, localStorage-backed `AppState`, Supabase record-level cloud sync.

## Global Constraints

- A Today target override changes only the selected date and never mutates `weeklyPlan` or `planSnapshot`.
- Empty text is a valid temporary editing state for every `input[type="number"]`.
- Required numbers clamp only when committed; optional set values commit empty text as `undefined`.
- Existing records without `itemTargetOverrides` must continue to decode unchanged.
- No new runtime dependency.
- Preserve the timer completion and reusable AudioContext changes already present in the worktree.

## File Map

- Create `src/components/NumericDraftInput.tsx`: reusable local string draft, blur validation, and min/max clamping.
- Create `src/components/NumericDraftInput.test.tsx`: direct interaction coverage for empty, multi-digit, and optional values.
- Create `src/domain/targets.ts`: parse and format round/minute targets.
- Create `src/domain/targets.test.ts`: bilingual parsing and unsupported-strength-detail coverage.
- Modify `src/domain/types.ts`: add `TrainingTarget` and `TrainingRecord.itemTargetOverrides`.
- Modify `src/domain/storage.ts`: validate and normalize target overrides.
- Modify `src/domain/storage.test.ts`: backup compatibility and malformed override tests.
- Modify `src/App.tsx`: migrate number inputs, add Today target controls, persist overrides, and use overrides in summaries/statistics.
- Modify `src/App.test.tsx`: Today override persistence, date isolation, custom-item editing, and numeric field regressions.
- Modify `src/styles.css`: compact mobile target stepper.

---

### Task 1: Reusable Numeric Draft Input

**Files:**
- Create: `src/components/NumericDraftInput.tsx`
- Create: `src/components/NumericDraftInput.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `NumericDraftInput` with `value?: number`, `min`, optional `max`, optional `allowEmpty`, and `onCommit(value: number | undefined)`.
- Consumes: native number-input attributes such as `aria-label`, `step`, `inputMode`, and `disabled`.

- [ ] **Step 1: Write failing component tests**

```tsx
it("stays empty while replacing a one-digit value with a multi-digit value", async () => {
  const user = userEvent.setup();
  const onCommit = vi.fn();
  render(<NumericDraftInput aria-label="Rounds" value={1} min={1} onCommit={onCommit} />);
  const input = screen.getByRole("spinbutton", { name: "Rounds" });
  await user.clear(input);
  expect(input).toHaveValue(null);
  await user.type(input, "12");
  expect(input).toHaveValue(12);
  await user.tab();
  expect(onCommit).toHaveBeenLastCalledWith(12);
});

it("commits undefined for an optional empty number", async () => {
  const user = userEvent.setup();
  const onCommit = vi.fn();
  render(<NumericDraftInput aria-label="Weight" value={20} min={0} allowEmpty onCommit={onCommit} />);
  await user.clear(screen.getByRole("spinbutton", { name: "Weight" }));
  await user.tab();
  expect(onCommit).toHaveBeenLastCalledWith(undefined);
});
```

- [ ] **Step 2: Run the component tests and verify RED**

Run: `npm test -- --run src/components/NumericDraftInput.test.tsx`

Expected: FAIL because `NumericDraftInput` does not exist.

- [ ] **Step 3: Implement the component**

```tsx
export interface NumericDraftInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "onBlur"> {
  value?: number;
  min: number;
  max?: number;
  allowEmpty?: boolean;
  onCommit: (value: number | undefined) => void;
}

export function NumericDraftInput({ value, min, max, allowEmpty = false, onCommit, ...inputProps }: NumericDraftInputProps) {
  const [draft, setDraft] = useState(value === undefined ? "" : String(value));
  useEffect(() => setDraft(value === undefined ? "" : String(value)), [value]);
  const commit = () => {
    if (draft === "" && allowEmpty) return onCommit(undefined);
    const parsed = Number(draft === "" ? min : draft);
    const next = Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min, Number.isFinite(parsed) ? parsed : min));
    setDraft(String(next));
    onCommit(next);
  };
  return <input {...inputProps} type="number" min={min} max={max} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} />;
}
```

- [ ] **Step 4: Run the component tests and verify GREEN**

Run: `npm test -- --run src/components/NumericDraftInput.test.tsx`

Expected: PASS.

- [ ] **Step 5: Replace immediate-coercion fields in `App.tsx`**

Use `NumericDraftInput` for timer rounds/work/rest, custom-drill default quantity, add-drill quantity, schedule duration, and Quick Log weight/repetition fields. Keep the existing set logger's `undefined` behavior by passing `allowEmpty`.

For submit handlers, normalize the current committed parent value:

```ts
const positiveQuantity = Math.max(1, quantity ?? 1);
const nonNegativeDuration = Math.max(0, duration ?? 0);
```

- [ ] **Step 6: Extend the App regression test**

```tsx
await user.click(screen.getByRole("button", { name: "新增動作" }));
await user.click(screen.getByRole("button", { name: /加入.*影子拳擊/ }));
const quantity = screen.getByRole("spinbutton", { name: "回合數" });
await user.clear(quantity);
expect(quantity).toHaveValue(null);
await user.type(quantity, "12");
expect(quantity).toHaveValue(12);
```

- [ ] **Step 7: Run focused tests and commit**

Run: `npm test -- --run src/components/NumericDraftInput.test.tsx src/App.test.tsx`

Expected: PASS.

```bash
git add src/components/NumericDraftInput.tsx src/components/NumericDraftInput.test.tsx src/App.tsx src/App.test.tsx
git commit -m "Fix numeric input editing"
```

---

### Task 2: Date-Scoped Target Model and Parsing

**Files:**
- Create: `src/domain/targets.ts`
- Create: `src/domain/targets.test.ts`
- Modify: `src/domain/types.ts`
- Modify: `src/domain/storage.ts`
- Modify: `src/domain/storage.test.ts`

**Interfaces:**
- Produces: `TrainingTarget = { quantity: number; unit: TrainingUnit }`.
- Produces: `parseTrainingTarget(detail: LocalizedLabel): TrainingTarget | null`.
- Produces: `formatTrainingTarget(target: TrainingTarget, language: Language): string`.
- Extends: `TrainingRecord.itemTargetOverrides?: Record<string, TrainingTarget>`.

- [ ] **Step 1: Write failing target parser tests**

```ts
expect(parseTrainingTarget({ zhTW: "超慢速 5 回合", en: "5 slow rounds" })).toEqual({ quantity: 5, unit: "rounds" });
expect(parseTrainingTarget({ zhTW: "核心 10 分鐘與伸展", en: "10 min core and mobility" })).toEqual({ quantity: 10, unit: "minutes" });
expect(parseTrainingTarget({ zhTW: "4 × 6–8", en: "4 × 6–8" })).toBeNull();
expect(formatTrainingTarget({ quantity: 12, unit: "rounds" }, "zh-TW")).toBe("12 回合");
```

- [ ] **Step 2: Run parser tests and verify RED**

Run: `npm test -- --run src/domain/targets.test.ts`

Expected: FAIL because the target module does not exist.

- [ ] **Step 3: Add the target type and parser**

```ts
export interface TrainingTarget {
  quantity: number;
  unit: TrainingUnit;
}

export function parseTrainingTarget(detail: LocalizedLabel): TrainingTarget | null {
  for (const text of [detail.zhTW, detail.en]) {
    const match = text.match(/(\d+(?:\.\d+)?)\s*(回合|rounds?|分鐘|minutes?|min)/i);
    if (!match) continue;
    return { quantity: Number(match[1]), unit: /回合|round/i.test(match[2]) ? "rounds" : "minutes" };
  }
  return null;
}
```

- [ ] **Step 4: Add failing storage validation tests**

```ts
const state = createEmptyState();
state.records["2026-08-03"] = {
  completedItemIds: [],
  itemTargetOverrides: { shadow: { quantity: 12, unit: "rounds" } },
};
saveState(state);
expect(loadState().records["2026-08-03"].itemTargetOverrides?.shadow).toEqual({ quantity: 12, unit: "rounds" });

const malformed = structuredClone(state);
malformed.records["2026-08-03"].itemTargetOverrides = { shadow: { quantity: 0, unit: "rounds" } };
expect(() => importState(JSON.stringify(malformed))).toThrow("Invalid backup");
```

- [ ] **Step 5: Validate and normalize overrides**

Add `isTrainingTarget` and `isItemTargetOverrides` to `storage.ts`. Require finite `quantity > 0` and unit `rounds` or `minutes`; include the optional map in `isTrainingRecord` and preserve it in `normalizeRecord`.

- [ ] **Step 6: Run domain tests and commit**

Run: `npm test -- --run src/domain/targets.test.ts src/domain/storage.test.ts`

Expected: PASS.

```bash
git add src/domain/targets.ts src/domain/targets.test.ts src/domain/types.ts src/domain/storage.ts src/domain/storage.test.ts
git commit -m "Add date scoped training targets"
```

---

### Task 3: Today Target Editor and Persistence

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `NumericDraftInput`, `parseTrainingTarget`, `formatTrainingTarget`, and `TrainingTarget` from Tasks 1-2.
- Produces: `TodayTargetEditor` props `{ target, language, onChange }`.

- [ ] **Step 1: Write failing planned-item persistence test**

```tsx
const first = render(<App initialDate={new Date(2026, 7, 3, 12)} />);
await user.click(screen.getByText("影子拳擊"));
const target = screen.getByRole("spinbutton", { name: "影子拳擊今日目標" });
await user.clear(target);
await user.type(target, "12");
await user.tab();
expect(screen.getByText("今日 12 回合")).toBeInTheDocument();
first.unmount();
render(<App initialDate={new Date(2026, 7, 3, 12)} />);
expect(screen.getByText("今日 12 回合")).toBeInTheDocument();
```

- [ ] **Step 2: Write failing date-isolation test**

```tsx
const first = render(<App initialDate={new Date(2026, 7, 3, 12)} />);
// Change Monday's Shadow Boxing to 12 rounds and persist it.
first.unmount();
render(<App initialDate={new Date(2026, 7, 10, 12)} />);
expect(screen.queryByText("今日 12 回合")).not.toBeInTheDocument();
expect(screen.getByText(/5 回合/)).toBeInTheDocument();
```

- [ ] **Step 3: Run App tests and verify RED**

Run: `npm test -- --run src/App.test.tsx`

Expected: FAIL because Today has no target editor or override rendering.

- [ ] **Step 4: Add target data to Today items**

For planned items, resolve:

```ts
const defaultTarget = parseTrainingTarget(item.detail);
const override = record.itemTargetOverrides?.[item.id];
const target = override ?? defaultTarget;
```

For custom items, use `{ quantity: item.quantity, unit: item.unit }`. When an override exists, render `今日 ${formatTrainingTarget(override, language)}` in the collapsed summary.

- [ ] **Step 5: Persist planned and custom edits**

```ts
const updateTarget = (itemId: string, kind: "planned" | "custom", target: TrainingTarget) => {
  if (kind === "planned") {
    updateRecord({ itemTargetOverrides: { ...(record.itemTargetOverrides ?? {}), [itemId]: target } });
    return;
  }
  updateRecord({ customItems: (record.customItems ?? []).map((item) => item.id === itemId ? { ...item, ...target } : item) });
};
```

When removing a planned item, omit its key from `itemTargetOverrides`. Existing `clearRecord` already removes the entire date record.

- [ ] **Step 6: Add the compact editor**

Render above `TrainingSetLogger` only when `target` is non-null:

```tsx
<TodayTargetEditor target={item.target} language={language} onChange={(target) => updateTarget(item.id, item.kind, target)} />
```

The editor uses icon-only minus/plus buttons, `NumericDraftInput`, a fixed unit label, minimum `1`, and accessible labels containing the drill title.

- [ ] **Step 7: Add mobile styling**

Add `.today-target-editor`, `.target-stepper`, and `.target-stepper button` styles with stable grid tracks, 44px touch targets, no nested card background, and responsive width that cannot overflow 320px screens.

- [ ] **Step 8: Run App tests and commit**

Run: `npm test -- --run src/App.test.tsx`

Expected: PASS.

```bash
git add src/App.tsx src/App.test.tsx src/styles.css
git commit -m "Edit daily training targets from Today"
```

---

### Task 4: History and Load Calculations

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `TrainingRecord.itemTargetOverrides` and `parseTrainingTarget`.
- Updates: `hasRecordContent`, `getRecordTrainingMinutes`, and `getRecordBoxingLoad`.

- [ ] **Step 1: Write failing history/load test**

Record a completed Shadow Boxing item with an override of 12 rounds, open History statistics, and assert the weekly boxing load includes 12 rather than the plan's 5 rounds.

```tsx
expect(screen.getByText(/12 回合/)).toBeInTheDocument();
```

- [ ] **Step 2: Run App tests and verify RED**

Run: `npm test -- --run src/App.test.tsx`

Expected: FAIL because load calculation still parses the weekly plan detail.

- [ ] **Step 3: Apply overrides to load calculations**

In `getRecordBoxingLoad`, for each completed planned item, prefer `record.itemTargetOverrides?.[item.id]`; otherwise parse the plan detail. Add the resulting quantity to rounds or minutes exactly once.

In `getRecordTrainingMinutes`, preserve logged set duration priority. Otherwise adjust `plan.duration` by the difference between overridden minute targets and their parsed defaults:

```ts
const minuteDelta = plan.items.reduce((total, item) => {
  const override = record.itemTargetOverrides?.[item.id];
  const fallback = parseTrainingTarget(item.detail);
  return override?.unit === "minutes" && fallback?.unit === "minutes"
    ? total + override.quantity - fallback.quantity
    : total;
}, 0);
return Math.max(0, plan.duration + minuteDelta);
```

Include `Object.keys(record.itemTargetOverrides ?? {}).length > 0` in `hasRecordContent` so an override-only date is saved and shown in History.

- [ ] **Step 4: Run focused and full verification**

Run: `npm test -- --run src/App.test.tsx src/domain/storage.test.ts src/domain/targets.test.ts src/components/NumericDraftInput.test.tsx`

Expected: PASS.

Run: `npm test && npm run build && git diff --check`

Expected: 0 failed tests, successful TypeScript/Vite build, and no whitespace errors. The existing Vite chunk-size warning may remain.

- [ ] **Step 5: Commit final integration**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "Use daily targets in training history"
```


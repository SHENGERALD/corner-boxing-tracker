# Quick Log Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an isolated, mobile-first quick-log preview that demonstrates one-tap boxing/cardio logging and lower-friction strength-set logging.

**Architecture:** `App` reads `preview=quick-log` from `window.location.search` before rendering the normal shell. A focused `QuickLogPreview` component owns in-memory demonstration state, so it cannot update localStorage, Supabase, or the normal training record. Existing design tokens and button styles are reused with preview-specific layout rules.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, existing CSS design tokens.

## Global Constraints

- The preview URL is exactly `?preview=quick-log`.
- It must not appear in the production navigation.
- It must not call localStorage, Supabase, or the existing record-update handlers.
- Boxing and cardio completion takes one tap.
- Strength set addition copies the preceding set values.
- Detail sheets support Escape, backdrop click, and a visible close control.
- Keep the preview clean at 390 px wide with no horizontal overflow.

---

### Task 1: Isolated Quick Log preview

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Modify: `src/App.test.tsx`

**Interfaces:**
- `QuickLogPreview(): JSX.Element` renders only when `new URLSearchParams(window.location.search).get("preview") === "quick-log"`.
- `PreviewSet` is `{ id: string; weight: number; reps: number; completed: boolean }`.
- `QuickLogPreview` owns `boxingComplete`, `cardioComplete`, `sets`, and `detailsOpen` through React state.

- [ ] **Step 1: Write the failing preview tests**

```tsx
it("renders the isolated quick log preview from its query parameter", () => {
  window.history.replaceState({}, "", "/?preview=quick-log");
  render(<App />);
  expect(screen.getByRole("heading", { name: "快速記錄原型" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "今天" })).not.toBeInTheDocument();
});

it("records boxing in one tap and copies the previous strength set", async () => {
  window.history.replaceState({}, "", "/?preview=quick-log");
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: "完成 影子拳擊" }));
  expect(screen.getByText("已完成")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "新增一組 深蹲" }));
  expect(screen.getByLabelText("第2組重量")).toHaveValue(60);
  expect(screen.getByLabelText("第2組次數")).toHaveValue(8);
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npm test -- --run src/App.test.tsx`

Expected: FAIL because no query-parameter preview or preview controls exist.

- [ ] **Step 3: Add the preview route and component**

```tsx
if (new URLSearchParams(window.location.search).get("preview") === "quick-log") {
  return <QuickLogPreview />;
}
```

Implement `QuickLogPreview` with three cards: Shadow boxing (3 rounds), Zone 2 run (20 minutes), and Back squat (60 kg x 8). Each boxing/cardio card has one completion button. The strength card has inline number inputs, a completion button per set, and an add-set button that copies the final set.

- [ ] **Step 4: Add a compact optional-details sheet**

```tsx
useEffect(() => {
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") setDetailsOpen(false);
  };
  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}, []);
```

Use a backdrop button with `aria-label="關閉細節"`, stop propagation inside the sheet, and a visible close button. Do not use this sheet for primary logging.

- [ ] **Step 5: Add mobile layout rules**

```css
.quick-log-preview { width: min(100%, 480px); margin: 0 auto; overflow-x: clip; }
.quick-log-card { min-width: 0; }
.quick-log-set { grid-template-columns: 44px minmax(0, 1fr) minmax(0, 1fr) 52px; }
```

Use existing color variables and set controls to at least 44 px high.

- [ ] **Step 6: Run focused and full verification**

Run:

```bash
npm test -- --run src/App.test.tsx
npm test -- --run
npm run build
```

Expected: all tests pass and Vite produces `dist/` successfully.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/App.test.tsx src/styles.css
git commit -m "Add isolated quick log preview"
```

## Plan Self-Review

- The query route keeps the prototype out of the normal navigation and normal app state.
- One-tap boxing/cardio completion, copied strength sets, and all sheet escape paths each have explicit implementation instructions.
- No dependency, storage schema, cloud data, or production Today behavior changes are required.

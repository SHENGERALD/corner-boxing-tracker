# Dark Adventure Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Build a mobile-first ten-floor dark adventure preview whose simulated training attacks enemies without modifying Corner training or cloud data.

**Architecture:** Keep progression in a pure \`adventure\` domain module with a dedicated localStorage key. Render it through focused React components opened from Today; \`AppState\`, backups, and Supabase remain untouched.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, CSS

**Spec:** \`docs/superpowers/specs/2026-09-18-dark-adventure-preview-design.md\`

## Global Constraints

- Ten floors with bosses on floors 5 and 10.
- Rest never removes health, experience, levels, or progress.
- Preview state uses \`corner-adventure-preview-v1\` and is never added to \`AppState\`.
- No remote images or new dependencies.
- Chinese and English follow the current application language.
- Mobile layouts have no horizontal scrolling and controls are at least 44px.
- Reduced-motion mode retains all state feedback.

---

### Task 1: Adventure Progression Domain

**Files:**
- Create: \`src/domain/adventure.ts\`
- Create: \`src/domain/adventure.test.ts\`

**Interfaces:**
- Produces: \`AdventureState\`, \`AdventureFloor\`, \`createAdventureState()\`, \`attackAdventure(state)\`, \`resetAdventure()\`, \`loadAdventure()\`, \`saveAdventure(state)\`.

- [ ] **Step 1: Write failing progression and storage tests**

\`\`\`ts
import { beforeEach, describe, expect, it } from "vitest";
import { attackAdventure, createAdventureState, loadAdventure, saveAdventure } from "./adventure";

describe("adventure preview", () => {
  beforeEach(() => localStorage.clear());

  it("damages the current enemy", () => {
    const initial = createAdventureState();
    const next = attackAdventure(initial);
    expect(next.floor).toBe(1);
    expect(next.enemyHp).toBeLessThan(initial.enemyHp);
  });

  it("advances after a defeat and completes floor ten", () => {
    let state = createAdventureState();
    for (let count = 0; count < 200 && !state.completed; count += 1) {
      state = attackAdventure(state);
    }
    expect(state.floor).toBe(10);
    expect(state.completed).toBe(true);
  });

  it("persists valid state and rejects malformed state", () => {
    const state = attackAdventure(createAdventureState());
    saveAdventure(state);
    expect(loadAdventure()).toEqual(state);
    localStorage.setItem("corner-adventure-preview-v1", '{"floor":99}');
    expect(loadAdventure()).toEqual(createAdventureState());
  });
});
\`\`\`

- [ ] **Step 2: Run the test and verify it fails**

Run: \`npx vitest run src/domain/adventure.test.ts\`

Expected: FAIL because \`src/domain/adventure.ts\` does not exist.

- [ ] **Step 3: Implement the types and ten floor definitions**

\`\`\`ts
export interface AdventureState {
  floor: number;
  enemyHp: number;
  enemyMaxHp: number;
  level: number;
  experience: number;
  experienceToNext: number;
  completed: boolean;
  lastEvent: "idle" | "hit" | "defeat" | "level-up" | "complete";
  eventId: number;
}

export interface AdventureFloor {
  floor: number;
  name: { zhTW: string; en: string };
  maxHp: number;
  rewardXp: number;
  boss: boolean;
}
\`\`\`

Define floors 1-10 with increasing HP, normal rewards, and bosses at floors 5 and 10. Use local bilingual names. \`attackAdventure\` deals 45 damage, grants the defeated floor reward, applies a 100 XP level threshold, advances to the next floor, and leaves floor 10 completed at zero HP. Every action increments \`eventId\`.

- [ ] **Step 4: Implement validated local persistence**

\`loadAdventure\` parses only finite, in-range numeric values, valid event names, and consistent floor HP. Invalid JSON or invalid values return \`createAdventureState()\`. \`saveAdventure\` only writes the preview key.

- [ ] **Step 5: Run the focused tests**

Run: \`npx vitest run src/domain/adventure.test.ts\`

Expected: all adventure domain tests PASS.

- [ ] **Step 6: Commit**

\`\`\`bash
git add src/domain/adventure.ts src/domain/adventure.test.ts
git commit -m "feat: add adventure preview progression"
\`\`\`

### Task 2: Mobile Adventure Preview UI

**Files:**
- Create: \`src/components/AdventurePreview.tsx\`
- Modify: \`src/styles.css\`
- Test: \`src/App.test.tsx\`

**Interfaces:**
- Consumes: all domain exports from Task 1.
- Produces: \`AdventureEntry\` and \`AdventurePreview\`.
- \`AdventurePreview\` props: \`{ language: Language; onClose: () => void }\`.

- [ ] **Step 1: Write failing UI tests**

\`\`\`tsx
it("opens the adventure preview and persists a simulated attack", async () => {
  const user = userEvent.setup();
  const first = render(<App initialDate={new Date(2026, 8, 18, 12)} />);
  await user.click(screen.getByRole("button", { name: "開啟冒險" }));
  expect(screen.getByRole("dialog", { name: "暗黑冒險預覽" })).toBeInTheDocument();
  const healthBefore = screen.getByTestId("enemy-health").textContent;
  await user.click(screen.getByRole("button", { name: "模擬完成訓練" }));
  expect(screen.getByTestId("enemy-health").textContent).not.toBe(healthBefore);
  first.unmount();
  render(<App initialDate={new Date(2026, 8, 18, 12)} />);
  await user.click(screen.getByRole("button", { name: "開啟冒險" }));
  expect(screen.getByTestId("enemy-health").textContent).not.toBe(healthBefore);
});
\`\`\`

Also add tests for reset, Escape, backdrop close, and English labels.

- [ ] **Step 2: Run the focused UI tests and verify they fail**

Run: \`npx vitest run src/App.test.tsx -t "adventure preview"\`

Expected: FAIL because the entry and dialog do not exist.

- [ ] **Step 3: Build the components**

\`AdventureEntry\` shows the current floor, enemy label, and HP. \`AdventurePreview\` loads once, saves after attack/reset, closes through Escape/backdrop/close button, and announces combat feedback with \`aria-live="polite"\`.

Use a native progress element:

\`\`\`tsx
<progress
  aria-label={language === "zh-TW" ? "敵人生命值" : "Enemy health"}
  max={state.enemyMaxHp}
  value={state.enemyHp}
/>
\`\`\`

The primary action is \`模擬完成訓練\` / \`Simulate completed workout\`; reset is \`重設預覽\` / \`Reset preview\`.

- [ ] **Step 4: Add responsive styles**

Add \`.adventure-entry\`, \`.adventure-backdrop\`, \`.adventure-panel\`, \`.adventure-scene\`, \`.adventure-enemy\`, \`.adventure-hud\`, and \`.adventure-impact\`. Use charcoal, Corner orange, and restrained boss crimson. Set panel width to \`min(100%, 720px)\`, scene \`aspect-ratio: 4 / 3\`, \`overflow: hidden\`, and controls \`min-height: 44px\`. Disable movement in \`@media (prefers-reduced-motion: reduce)\`.

- [ ] **Step 5: Run focused tests**

Run: \`npx vitest run src/App.test.tsx -t "adventure preview" --testTimeout=15000\`

Expected: all adventure UI tests PASS.

- [ ] **Step 6: Commit**

\`\`\`bash
git add src/components/AdventurePreview.tsx src/styles.css src/App.test.tsx
git commit -m "feat: add mobile adventure preview UI"
\`\`\`

### Task 3: Today Integration And Verification

**Files:**
- Modify: \`src/App.tsx\`
- Modify: \`src/App.test.tsx\`

**Interfaces:**
- Consumes: \`AdventureEntry\` and \`AdventurePreview\`.
- App-local state: \`const [adventureOpen, setAdventureOpen] = useState(false)\`.

- [ ] **Step 1: Add a failing isolation test**

\`\`\`tsx
it("keeps adventure preview data outside the application state", async () => {
  const user = userEvent.setup();
  render(<App initialDate={new Date(2026, 8, 18, 12)} />);
  await user.click(screen.getByRole("button", { name: "開啟冒險" }));
  await user.click(screen.getByRole("button", { name: "模擬完成訓練" }));
  expect(localStorage.getItem("boxing-tracker-v1") ?? "").not.toContain("enemyHp");
  expect(localStorage.getItem("corner-adventure-preview-v1")).toContain("enemyHp");
});
\`\`\`

- [ ] **Step 2: Run the isolation test and verify it fails**

Run: \`npx vitest run src/App.test.tsx -t "outside the application state"\`

Expected: FAIL until the preview is wired into \`App\`.

- [ ] **Step 3: Integrate with Today**

Render \`AdventureEntry\` below the Today overview and above training progress. Render \`AdventurePreview\` beside the existing top-level panels when \`adventureOpen\` is true. Do not pass \`AppState\`, records, or \`setState\` into either adventure component.

- [ ] **Step 4: Run complete verification**

\`\`\`bash
npm test -- --testTimeout=15000
npm run build
git diff --check
\`\`\`

Expected: all tests PASS, production build succeeds, and diff check is clean. The existing bundle-size advisory may remain.

- [ ] **Step 5: Inspect at 390 x 844**

Verify no horizontal overflow, HP remains inside the scene, the action stays visible, and closing returns to the same Today position.

- [ ] **Step 6: Commit**

\`\`\`bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: integrate adventure preview with today"
\`\`\`


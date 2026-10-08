import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { AdventurePreview } from "./AdventurePreview";
import { ADVENTURE_KEY, attackAdventure, createAdventureState, saveAdventure } from "../domain/adventure";

describe("adventure preview", () => {
  beforeEach(() => { localStorage.clear(); window.history.replaceState({}, "", "/"); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("opens from Today, attacks, persists, resets, and leaves all formal storage byte-identical", async () => {
    const user = userEvent.setup();
    const first = render(<App initialDate={new Date(2026, 8, 18, 12)} />);
    const snapshot = () => Object.fromEntries(Object.keys(localStorage).filter(key => key !== ADVENTURE_KEY).map(key => [key, localStorage.getItem(key)]));
    const formal = snapshot();
    await user.click(screen.getByRole("button", { name: "開啟冒險" }));
    expect(screen.getByRole("dialog", { name: "暗黑冒險預覽" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "模擬完成訓練" }));
    expect(screen.getByTestId("enemy-health")).toHaveTextContent("45 / 90");
    expect(snapshot()).toEqual(formal);
    first.unmount();
    render(<App initialDate={new Date(2026, 8, 18, 12)} />);
    await user.click(screen.getByRole("button", { name: "開啟冒險" }));
    expect(screen.getByTestId("enemy-health")).toHaveTextContent("45 / 90");
    await user.click(screen.getByRole("button", { name: "重設預覽" }));
    expect(screen.getByTestId("enemy-health")).toHaveTextContent("90 / 90");
    await user.click(screen.getByRole("button", { name: "關閉冒險" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("traps focus, restores focus and scroll lock, closes on Escape and backdrop", async () => {
    const user = userEvent.setup();
    render(<App />);
    const entry = screen.getByRole("button", { name: "開啟冒險" });
    await user.click(entry);
    const close = screen.getByRole("button", { name: "關閉冒險" });
    expect(close).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "重設預覽" })).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(entry).toHaveFocus();
    expect(document.body.style.overflow).not.toBe("hidden");
    await user.click(entry);
    fireEvent.click(screen.getByTestId("adventure-backdrop"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("follows language changes without resetting progress and reports defeat and XP", async () => {
    const user = userEvent.setup();
    const props = { onClose: vi.fn() };
    const view = render(<AdventurePreview language="zh-TW" {...props} />);
    await user.click(screen.getByRole("button", { name: "模擬完成訓練" }));
    view.rerender(<AdventurePreview language="en" {...props} />);
    expect(screen.getByRole("dialog", { name: "Dark adventure preview" })).toBeInTheDocument();
    expect(screen.getByTestId("enemy-health")).toHaveTextContent("45 / 90");
    await user.click(screen.getByRole("button", { name: "Simulate completed workout" }));
    expect(screen.getByRole("status")).toHaveTextContent("+40 XP");
    expect(screen.getByRole("status")).toHaveTextContent("Floor 2");
  });

  it("finishes the tower, disables attacks, and can restart", async () => {
    let state = createAdventureState();
    while (!(state.floor === 10 && state.enemyHp <= 45)) state = attackAdventure(state);
    saveAdventure(state);
    const user = userEvent.setup();
    render(<AdventurePreview language="en" onClose={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Simulate completed workout" }));
    expect(screen.getByRole("heading", { name: "Tower conquered" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Simulate completed workout" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Reset preview" }));
    expect(within(screen.getByRole("dialog")).getByText("Ash Sentinel")).toBeInTheDocument();
  });

  it("keeps playing with a visible warning when persistence fails", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("full"); });
    const user = userEvent.setup();
    render(<AdventurePreview language="en" onClose={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Simulate completed workout" }));
    expect(screen.getByTestId("enemy-health")).toHaveTextContent("45 / 90");
    expect(screen.getByRole("alert")).toHaveTextContent("Progress could not be saved");
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";

describe("Boxing Tracker", () => {
  beforeEach(() => localStorage.clear());

  it("saves checked items and notes, then restores them after remount", async () => {
    const user = userEvent.setup();
    const first = render(<App initialDate={new Date(2026, 6, 30, 12)} />);

    const coachClass = screen.getByRole("checkbox", { name: /一對一教練課/ });
    await user.click(coachClass);
    await user.type(screen.getByLabelText("技術筆記"), "刺拳後立刻回防");

    first.unmount();
    render(<App initialDate={new Date(2026, 6, 30, 12)} />);

    expect(screen.getByRole("checkbox", { name: /一對一教練課/ })).toBeChecked();
    expect(screen.getByLabelText("技術筆記")).toHaveValue("刺拳後立刻回防");
  });

  it("switches interface and plan labels to English", async () => {
    const user = userEvent.setup();
    render(<App initialDate={new Date(2026, 6, 30, 12)} />);

    await user.click(screen.getByRole("button", { name: "備份" }));
    await user.click(screen.getByRole("button", { name: "English" }));

    expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByText("Your data stays on this device.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Today" }));
    expect(screen.getByText("Coaching + Self Training")).toBeInTheDocument();
  });

  it("opens a selected day from the weekly view", async () => {
    const user = userEvent.setup();
    render(<App initialDate={new Date(2026, 6, 30, 12)} />);

    await user.click(screen.getByRole("button", { name: "本週" }));
    await user.click(screen.getByRole("button", { name: /週一/ }));

    expect(screen.getByText("低強度技術")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /跳繩/ })).toBeInTheDocument();
  });
});

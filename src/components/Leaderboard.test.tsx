import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Leaderboard } from "./Leaderboard";
import { fetchLeaderboard, saveLeaderboardProfile } from "../domain/leaderboardApi";

vi.mock("../domain/leaderboardApi", () => ({
  fetchLeaderboard: vi.fn(),
  saveLeaderboardProfile: vi.fn(),
}));

const fetchMock = vi.mocked(fetchLeaderboard);
const saveMock = vi.mocked(saveLeaderboardProfile);

describe("weekly leaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockResolvedValue({
      profile: null,
      rows: [{ week_start: "2026-10-05", position: 1, display_name: "第一名", points: 45, training_days: 1, is_me: false }],
    });
    saveMock.mockResolvedValue();
  });
  afterEach(cleanup);

  it("refreshes after a successful sync without discarding nickname edits", async () => {
    const user = userEvent.setup();
    const view = render(<Leaderboard language="en" userId="user-1" syncVersion={0} />);
    await screen.findByText("第一名");
    await user.type(screen.getByRole("textbox", { name: "Public nickname" }), "Draft name");
    fetchMock.mockResolvedValue({ profile: null, rows: [{ week_start: "2026-10-05", position: 1, display_name: "Updated", points: 90, training_days: 2, is_me: false }] });
    view.rerender(<Leaderboard language="en" userId="user-1" syncVersion={1} />);
    await screen.findByText("Updated");
    expect(screen.getByRole("textbox", { name: "Public nickname" })).toHaveValue("Draft name");
    expect(screen.getByText(/2026-10-05.*2026-10-11/)).toBeInTheDocument();
    expect(screen.getByText(/2026-10-12 00:00 UTC/)).toBeInTheDocument();
  });

  it("requires an account and never opts a guest into a public ranking", () => {
    render(<Leaderboard language="zh-TW" userId={undefined} />);
    expect(screen.getByText("登入後可查看排行榜")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("starts private, then saves a public nickname only after explicit consent", async () => {
    const user = userEvent.setup();
    render(<Leaderboard language="zh-TW" userId="user-1" />);
    expect(await screen.findByText("第一名")).toBeInTheDocument();
    const consent = screen.getByRole("checkbox", { name: "參加本週排行榜" });
    expect(consent).not.toBeChecked();
    expect(screen.getByRole("button", { name: "儲存排行榜設定" })).toBeDisabled();
    await user.type(screen.getByRole("textbox", { name: "公開暱稱" }), "  Corner 拳手  ");
    await user.click(consent);
    await user.click(screen.getByRole("button", { name: "儲存排行榜設定" }));
    await waitFor(() => expect(saveMock).toHaveBeenCalledWith("user-1", "Corner 拳手", true));
  });

  it("lets an opted-in user leave the public ranking", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue({ profile: { display_name: "Corner 拳手", opt_in: true }, rows: [] });
    render(<Leaderboard language="zh-TW" userId="user-1" />);
    const consent = await screen.findByRole("checkbox", { name: "參加本週排行榜" });
    expect(consent).toBeChecked();
    await user.click(consent);
    await user.click(screen.getByRole("button", { name: "儲存排行榜設定" }));
    await waitFor(() => expect(saveMock).toHaveBeenCalledWith("user-1", "Corner 拳手", false));
  });

  it("shows a recoverable error when the database feature is unavailable", async () => {
    fetchMock.mockRejectedValue(new Error("RPC missing"));
    render(<Leaderboard language="en" userId="user-1" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Leaderboard unavailable");
  });

  it("warns that points can lag when training sync has failed", async () => {
    render(<Leaderboard language="zh-TW" userId="user-1" syncStatus="error" />);
    expect(await screen.findByText("第一名")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("積分可能尚未更新");
  });

  it("preserves the nickname and consent after a failed save so it can be retried", async () => {
    const user = userEvent.setup();
    saveMock.mockRejectedValueOnce(new Error("Network error"));
    render(<Leaderboard language="en" userId="user-1" />);
    await screen.findByText("第一名");
    await user.type(screen.getByRole("textbox", { name: "Public nickname" }), "My name");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Save leaderboard settings" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("textbox", { name: "Public nickname" })).toHaveValue("My name");
    expect(screen.getByRole("checkbox")).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Save leaderboard settings" }));
    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(2));
  });
});

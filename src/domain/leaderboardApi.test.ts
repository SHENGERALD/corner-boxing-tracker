import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchLeaderboard, saveLeaderboardProfile } from "./leaderboardApi";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  rpc: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("./supabase", () => ({ supabase: { from: mocks.from, rpc: mocks.rpc } }));

describe("leaderboard API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({ select: mocks.select, upsert: mocks.upsert });
    mocks.select.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle });
    mocks.maybeSingle.mockResolvedValue({ data: { display_name: "Corner", opt_in: false }, error: null });
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    mocks.upsert.mockResolvedValue({ error: null });
  });

  it("reads only the caller's private profile and the aggregate leaderboard RPC", async () => {
    await fetchLeaderboard("user-1");
    expect(mocks.from).toHaveBeenCalledWith("leaderboard_profiles");
    expect(mocks.select).toHaveBeenCalledWith("display_name, opt_in");
    expect(mocks.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(mocks.rpc).toHaveBeenCalledWith("get_weekly_leaderboard");
  });

  it("writes only an explicit profile preference, never training records", async () => {
    await saveLeaderboardProfile("user-1", "Corner", true);
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: "user-1", display_name: "Corner", opt_in: true,
    }), { onConflict: "user_id" });
    expect(mocks.from).not.toHaveBeenCalledWith("user_app_states");
  });

  it("surfaces RPC errors instead of showing an empty leaderboard", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error("RPC missing") });
    await expect(fetchLeaderboard("user-1")).rejects.toThrow("RPC missing");
  });
});

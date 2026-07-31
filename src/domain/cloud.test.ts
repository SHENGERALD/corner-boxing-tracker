import { describe, expect, it } from "vitest";
import { resolveInitialState } from "./cloud";
import { createEmptyState } from "./storage";

const stateWithLanguage = (language: "zh-TW" | "en") => ({ ...createEmptyState(), language });

describe("cloud state resolution", () => {
  it("keeps a newer offline account cache and schedules it for upload", () => {
    const result = resolveInitialState({
      guestState: stateWithLanguage("zh-TW"),
      accountState: stateWithLanguage("en"),
      accountSavedAt: "2026-07-30T20:00:00.000Z",
      cloudState: stateWithLanguage("zh-TW"),
      cloudUpdatedAt: "2026-07-30T19:00:00.000Z",
    });
    expect(result.source).toBe("cloud");
    expect(result.shouldUpload).toBe(false);
    expect(result.state.language).toBe("zh-TW");
  });

  it("uses newer cloud data when the account cache is already synced", () => {
    const result = resolveInitialState({
      guestState: stateWithLanguage("zh-TW"),
      accountState: stateWithLanguage("en"),
      accountSavedAt: "2026-07-30T18:00:00.000Z",
      cloudState: stateWithLanguage("zh-TW"),
      cloudUpdatedAt: "2026-07-30T19:00:00.000Z",
    });
    expect(result.source).toBe("cloud");
    expect(result.shouldUpload).toBe(false);
  });

  it("uploads guest data only when the account has no cloud or local state", () => {
    const guest = stateWithLanguage("en");
    const result = resolveInitialState({ guestState: guest, accountState: null, accountSavedAt: null, cloudState: null, cloudUpdatedAt: null });
    expect(result).toMatchObject({ state: guest, source: "guest", shouldUpload: true });
  });
});

  it("merges newer records from both local and cloud states", () => {
    const local = stateWithLanguage("en");
    const cloud = stateWithLanguage("zh-TW");
    local.records = {
      "2026-07-30": { completedItemIds: ["local"], updatedAt: "2026-07-30T20:00:00.000Z" },
    };
    cloud.records = {
      "2026-07-29": { completedItemIds: ["cloud-only"], updatedAt: "2026-07-30T21:00:00.000Z" },
      "2026-07-30": { completedItemIds: ["cloud-old"], updatedAt: "2026-07-30T19:00:00.000Z" },
    };

    const result = resolveInitialState({
      guestState: createEmptyState(),
      accountState: local,
      accountSavedAt: "2026-07-30T20:00:00.000Z",
      cloudState: cloud,
      cloudUpdatedAt: "2026-07-30T21:00:00.000Z",
    });

    expect(result.source).toBe("cloud");
    expect(result.shouldUpload).toBe(true);
    expect(result.state.language).toBe("zh-TW");
    expect(result.state.records).toEqual({
      "2026-07-29": cloud.records["2026-07-29"],
      "2026-07-30": local.records["2026-07-30"],
    });
  });

  it("uses the newer local weekly plan and uploads only when it wins", () => {
    const local = stateWithLanguage("en");
    const cloud = stateWithLanguage("zh-TW");
    local.weeklyPlanUpdatedAt = "2026-07-30T22:00:00.000Z";
    cloud.weeklyPlanUpdatedAt = "2026-07-30T21:00:00.000Z";
    local.weeklyPlan[1] = { ...local.weeklyPlan[1], session: { zhTW: "本地課表", en: "Local plan" } };
    cloud.weeklyPlan[1] = { ...cloud.weeklyPlan[1], session: { zhTW: "雲端課表", en: "Cloud plan" } };

    const result = resolveInitialState({
      guestState: createEmptyState(),
      accountState: local,
      accountSavedAt: null,
      cloudState: cloud,
      cloudUpdatedAt: "2026-07-30T21:00:00.000Z",
    });

    expect(result.shouldUpload).toBe(true);
    expect(result.state.weeklyPlan[1].session.zhTW).toBe("本地課表");
    expect(result.state.favoriteDrillIds).toEqual(cloud.favoriteDrillIds);
  });

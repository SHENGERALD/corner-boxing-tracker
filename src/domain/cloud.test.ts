import { describe, expect, it } from "vitest";
import { mergeForRevisionedSave, resolveInitialState } from "./cloud";
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

it("keeps a newer local deletion instead of restoring the cloud record", () => {
  const local = stateWithLanguage("zh-TW");
  const cloud = stateWithLanguage("zh-TW");
  cloud.records = { "2026-07-30": { completedItemIds: ["old"], updatedAt: "2026-07-30T20:00:00.000Z" } };
  local.deletedRecordUpdatedAt = { "2026-07-30": "2026-07-30T21:00:00.000Z" };
  const result = resolveInitialState({ guestState: createEmptyState(), accountState: local, accountSavedAt: null, cloudState: cloud, cloudUpdatedAt: null });
  expect(result.shouldUpload).toBe(true);
  expect(result.state.records).toEqual({});
  expect(result.state.deletedRecordUpdatedAt?.["2026-07-30"]).toBe("2026-07-30T21:00:00.000Z");
});

it("keeps unrelated local records while accepting a newer cloud record", () => {
  const local = stateWithLanguage("zh-TW");
  const cloud = stateWithLanguage("zh-TW");
  local.records = { "2026-07-29": { completedItemIds: ["local"], updatedAt: "2026-07-30T20:00:00.000Z" } };
  cloud.records = { "2026-07-30": { completedItemIds: ["cloud"], updatedAt: "2026-07-30T21:00:00.000Z" } };
  const result = resolveInitialState({ guestState: createEmptyState(), accountState: local, accountSavedAt: null, cloudState: cloud, cloudUpdatedAt: null });
  expect(result.state.records).toEqual({ "2026-07-29": local.records["2026-07-29"], "2026-07-30": cloud.records["2026-07-30"] });
});

it("merges favorites from both devices and respects a newer unfavorite", () => {
  const local = stateWithLanguage("zh-TW");
  const cloud = stateWithLanguage("zh-TW");
  local.favoriteDrillIds = ["local-favorite"];
  local.favoriteDrillUpdatedAt = { "shared": "2026-08-01T21:00:00.000Z", "local-favorite": "2026-08-01T21:00:00.000Z" };
  cloud.favoriteDrillIds = ["shared", "cloud-favorite"];
  cloud.favoriteDrillUpdatedAt = { "shared": "2026-08-01T20:00:00.000Z", "cloud-favorite": "2026-08-01T20:00:00.000Z" };
  const result = resolveInitialState({ guestState: createEmptyState(), accountState: local, accountSavedAt: null, cloudState: cloud, cloudUpdatedAt: null });
  expect(result.state.favoriteDrillIds).toEqual(["local-favorite", "cloud-favorite"]);
  expect(result.state.favoriteDrillUpdatedAt?.shared).toBe("2026-08-01T21:00:00.000Z");
});

it("merges custom drills added on both devices", () => {
  const local = stateWithLanguage("zh-TW");
  const cloud = stateWithLanguage("zh-TW");
  const localDrill = { id: "custom-local", domain: "boxing" as const, category: "offense" as const, name: { zhTW: "本地動作", en: "Local drill" }, cue: { zhTW: "提示", en: "Cue" }, defaultUnit: "rounds" as const, defaultQuantity: 3 };
  const cloudDrill = { id: "custom-cloud", domain: "boxing" as const, category: "defense" as const, name: { zhTW: "雲端動作", en: "Cloud drill" }, cue: { zhTW: "提示", en: "Cue" }, defaultUnit: "rounds" as const, defaultQuantity: 3 };
  local.customDrills = [localDrill];
  cloud.customDrills = [cloudDrill];
  const result = resolveInitialState({ guestState: createEmptyState(), accountState: local, accountSavedAt: null, cloudState: cloud, cloudUpdatedAt: null });
  expect(result.state.customDrills?.map((drill) => drill.id)).toEqual(["custom-cloud", "custom-local"]);
});


describe("revision-aware cloud saves", () => {
  it("keeps independent records when a stale writer refetches before retrying", () => {
    const local = createEmptyState();
    const cloud = createEmptyState();
    local.records["2026-08-01"] = { completedItemIds: ["local"], updatedAt: "2026-08-01T20:00:00.000Z" };
    cloud.records["2026-08-02"] = { completedItemIds: ["cloud"], updatedAt: "2026-08-01T21:00:00.000Z" };

    const result = mergeForRevisionedSave(local, { state: cloud, revision: 7 });

    expect(result.expectedRevision).toBe(7);
    expect(result.state.records).toMatchObject({
      "2026-08-01": local.records["2026-08-01"],
      "2026-08-02": cloud.records["2026-08-02"],
    });
  });
});

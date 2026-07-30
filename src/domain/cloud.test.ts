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
    expect(result.source).toBe("account");
    expect(result.shouldUpload).toBe(true);
    expect(result.state.language).toBe("en");
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

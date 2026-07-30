import { describe, expect, it } from "vitest";
import { formatPlanLabel, t } from "./i18n";

describe("i18n", () => {
  it("defaults interface copy to Traditional Chinese labels", () => {
    expect(t("zh-TW", "nav.today")).toBe("今天");
    expect(t("en", "nav.today")).toBe("Today");
  });

  it("formats localized plan labels by selected language", () => {
    expect(formatPlanLabel({ zhTW: "週四", en: "Thu" }, "zh-TW")).toBe("週四");
    expect(formatPlanLabel({ zhTW: "週四", en: "Thu" }, "en")).toBe("Thu");
  });
});

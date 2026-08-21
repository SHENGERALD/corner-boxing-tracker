import { describe, expect, it } from "vitest";
import { formatPlanLabel, getEquipmentLabel, t } from "./i18n";

describe("i18n", () => {
  it("defaults interface copy to Traditional Chinese labels", () => {
    expect(t("zh-TW", "nav.today")).toBe("今天");
    expect(t("en", "nav.today")).toBe("Today");
  });

  it("formats localized plan labels by selected language", () => {
    expect(formatPlanLabel({ zhTW: "週四", en: "Thu" }, "zh-TW")).toBe("週四");
    expect(formatPlanLabel({ zhTW: "週四", en: "Thu" }, "en")).toBe("Thu");
  });

  it("uses pulley terminology for cable equipment in Traditional Chinese", () => {
    expect(getEquipmentLabel("cable", "zh-TW")).toBe("滑輪");
    expect(getEquipmentLabel("cable", "en")).toBe("Cable");
    expect(getEquipmentLabel("cable", "zh-TW")).not.toBe("繩索");
  });
});

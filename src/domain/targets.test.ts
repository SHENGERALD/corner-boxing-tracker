import { describe, expect, it } from "vitest";
import { formatTrainingTarget, parseTrainingTarget } from "./targets";

describe("training targets", () => {
  it("parses bilingual round and minute details", () => {
    expect(parseTrainingTarget({ zhTW: "超慢速 5 回合", en: "5 slow rounds" })).toEqual({ quantity: 5, unit: "rounds" });
    expect(parseTrainingTarget({ zhTW: "核心 10 分鐘與伸展", en: "10 min core and mobility" })).toEqual({ quantity: 10, unit: "minutes" });
  });

  it("does not parse non-target numeric details", () => {
    expect(parseTrainingTarget({ zhTW: "4 × 6–8", en: "4 × 6–8" })).toBeNull();
  });

  it("formats targets in the requested language", () => {
    expect(formatTrainingTarget({ quantity: 12, unit: "rounds" }, "zh-TW")).toBe("12 回合");
  });
});

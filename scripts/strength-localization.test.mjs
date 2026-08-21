import assert from "node:assert/strict";
import test from "node:test";

const localization = await import("./strength-localization.mjs").catch(() => ({}));
const normalizeTaiwanTerms = localization.normalizeTaiwanTerms ?? ((value) => value);
const reviewLocalizedRecord = localization.reviewLocalizedRecord ?? ((record) => record);
const findLocalizationIssues = localization.findLocalizationIssues ?? (() => []);
const hasCompleteReviewedCopy = localization.hasCompleteReviewedCopy ?? (() => false);

test("normalizes common cable movements to Taiwan strength terms", () => {
  assert.equal(normalizeTaiwanTerms("Cable Curl"), "滑輪彎舉");
  assert.equal(normalizeTaiwanTerms("Cable Fly"), "滑輪飛鳥");
  assert.equal(normalizeTaiwanTerms("High Row"), "高位划船");
  assert.equal(normalizeTaiwanTerms("Cable Tricep Kickback"), "滑輪三頭肌後踢");
  assert.doesNotMatch(
    normalizeTaiwanTerms("Cable Curls"),
    /電纜|高排|回扣|飛翼|旋度|拒絕/
  );
  assert.equal(
    normalizeTaiwanTerms("俯臥撐 |拒絕", { englishName: "Push-Ups | Decline" }),
    "俯臥撐 |下斜"
  );
});

test("reviewed localization wins without changing English search data", () => {
  const record = {
    id: "wger-9001",
    name: { zhTW: "Cable Bayesian Curl", en: "Cable Bayesian Curl" },
    cue: { zhTW: "Curl with control.", en: "Curl with control." },
    equipment: "cable",
    searchTerms: ["Cable Bayesian Curl", "arms", "cable"],
  };
  const searchTerms = [...record.searchTerms];

  const reviewed = reviewLocalizedRecord(record, {
    "wger-9001": {
      name: { zhTW: "貝氏滑輪彎舉" },
      cue: { zhTW: "背對滑輪站立，讓上臂維持在身體後方並控制彎舉。" },
    },
  });

  assert.equal(reviewed.name.zhTW, "貝氏滑輪彎舉");
  assert.equal(reviewed.name.en, "Cable Bayesian Curl");
  assert.equal(reviewed.cue.en, "Curl with control.");
  assert.deepEqual(reviewed.searchTerms, searchTerms);
});

test("reports forbidden literal translations and missing Chinese copy", () => {
  const issues = findLocalizationIssues([
    {
      id: "wger-1",
      name: { zhTW: "低滑輪電纜飛翼", en: "Low Pulley Cable Fly" },
      cue: { zhTW: "保持控制。", en: "Move with control." },
    },
    {
      id: "wger-2",
      name: { zhTW: "Cable Row", en: "Cable Row" },
      cue: { zhTW: "Pull with control.", en: "Pull with control." },
    },
  ]);

  assert.deepEqual(issues.map((issue) => [issue.id, issue.field, issue.issue]), [
    ["wger-1", "name", "forbidden-term"],
    ["wger-2", "name", "missing-chinese"],
    ["wger-2", "cue", "missing-chinese"],
  ]);
});

test("recognizes only complete reviewed Chinese copy", () => {
  assert.equal(hasCompleteReviewedCopy({
    name: { zhTW: "貝氏滑輪彎舉" },
    cue: { zhTW: "背對滑輪站立並控制彎舉。" },
  }), true);
  assert.equal(hasCompleteReviewedCopy({
    name: { zhTW: "貝氏滑輪彎舉" },
  }), false);
});

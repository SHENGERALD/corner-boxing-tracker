# Strength Localization and Cable Media Audit

Date: 2026-08-10

## Goal

Make the strength library read like a Taiwan-focused training product instead of a machine-translated dataset, and ensure every cable exercise uses a movement-appropriate illustration.

The current generated catalog contains 831 strength records. The cable subset contains 98 records; 68 currently fall back to a generic body-part image. The translation cache is produced by direct machine translation, which creates terms such as 電纜彎舉, 高排, 回扣, 拒絕 and 飛翼 that are not acceptable exercise names in Taiwan.

## Scope

This work includes:

- Audit all 831 Traditional Chinese exercise titles and cues.
- Apply a deterministic Taiwan strength-training terminology standard.
- Add reviewed per-record localization overrides for ambiguous titles and cues.
- Audit all 98 cable records.
- Replace every generic cable fallback image with a reviewed movement-family image.
- Review existing wger images used by cable records and replace images that do not match the movement.
- Produce an anomaly report for non-cable images and correct obvious high-confidence mismatches found during the audit.
- Preserve reviewed corrections when the wger catalog is imported again.

This work does not include generating a unique image for every one of the 831 records or rewriting the English source data.

## Terminology Standard

Cable equipment is displayed as 滑輪. 繩索 is reserved for a rope attachment.

Preferred Taiwan terms include:

| English | Traditional Chinese |
| --- | --- |
| Cable | 滑輪 |
| Rope attachment | 繩索 |
| Cable curl | 滑輪彎舉 |
| Cable fly | 滑輪飛鳥 |
| Cable crossover | 滑輪夾胸 |
| Triceps pushdown | 三頭肌下壓 |
| Rope triceps pushdown | 繩索三頭肌下壓 |
| Row | 划船 |
| Pulldown | 下拉 |
| Press | 推舉, 推胸, or 下壓 according to movement |
| Curl | 彎舉 |
| Extension | 伸展 or 臂屈伸 according to joint action |
| Raise | 前平舉, 側平舉, or Y 字上舉 according to direction |
| Fly / Flye | 飛鳥 |
| Neutral grip | 對握 |
| Pronated grip | 正握 |
| Supinated grip | 反握 |
| Single-arm | 單臂 |
| Cross-body | 跨體 |
| Plate-loaded | 片掛式 |
| Leverage machine | 槓桿式機械 |

Rules may safely compose simple modifiers, but ambiguous movement names must use explicit sourceId overrides. Brand names remain in English only when they identify a distinct machine or established movement.

The audit rejects known literal-translation terms in exercise titles, including 電纜, 拒絕, 回扣, 高排, 陷阱, 飛翼 and 旋度.

## Localization Architecture

Machine translation remains an import aid, not the final product copy.

The generated record passes through these layers:

1. Original wger English title, cue, category, equipment and media.
2. Existing machine-translated Traditional Chinese cache.
3. Taiwan terminology normalization for high-confidence phrases.
4. Reviewed sourceId localization override for ambiguous or incorrect records.
5. Validation that reports forbidden literal terms, untranslated fragments and suspicious mixed-language output.

Reviewed localization lives in a dedicated source file separate from generated category modules. The importer and runtime loader both apply the same reviewed data, so re-importing wger cannot remove corrections.

Search terms retain the English source name and include the final Traditional Chinese name.

## Cable Movement Families

The 98 cable records are mapped to approximately 25 to 35 movement families. Records may share an image only when the setup, direction of force and body position are materially the same.

Family dimensions include:

- Body region: chest, back, shoulders, arms, core and lower body.
- Direction: high-to-low, horizontal, low-to-high and rotational.
- Stance: standing, seated, kneeling, half-kneeling and lying.
- Laterality: bilateral, alternating and single-arm.
- Attachment: D-handle, straight bar, EZ bar, V-bar and rope.

Examples:

- Bilateral standing cable curl and single-arm Bayesian curl are different families.
- Straight-bar pushdown and rope pushdown are different families.
- High cable fly, horizontal cable fly and low cable fly are different families.
- Wide-grip lat pulldown and neutral-grip V-bar pulldown may share the machine frame but need different grip illustrations.

Every cable record receives a reviewed familyId and a reviewed local image. No cable record may use assets/strength/generated/<body-part>.webp after this work.

## Media Style

New local illustrations follow the existing approved Corner strength style:

- Square 1:1 composition.
- Warm off-white background.
- Charcoal and graphite athlete and equipment.
- Corner orange highlights on the primary target muscles.
- Complete athlete and cable setup visible.
- No logo, text, watermark, border or cropped equipment.
- Movement direction and pulley height must be visually unambiguous.

Images are resized and compressed for mobile use. Family images are loaded only when the strength library is opened.

## Data Flow

At import time:

1. Normalize the wger record.
2. Apply terminology normalization.
3. Apply reviewed localization and media overrides.
4. Write generated category modules.
5. Run catalog validation.

At runtime:

1. Load the selected strength category.
2. Merge reviewed overrides as a safety layer.
3. Resolve BASE_URL for local assets.
4. Render the final localized record.

## Validation

Automated checks must verify:

- All 831 records contain Traditional Chinese titles and cues.
- No reviewed title contains a known forbidden literal-translation term.
- Every reviewed override references an existing sourceId.
- Every cable record has a familyId.
- Every cable image exists locally or is an explicitly reviewed external source.
- No cable record uses a generic body-part fallback image.
- Reviewed equipment, localization and media survive a fixture-based re-import.
- Duplicate IDs and missing media still fail catalog validation.
- Production build succeeds.

Manual review includes:

- A contact sheet grouped by cable movement family.
- Mobile checks of search, equipment filtering and card image cropping.
- Spot checks for unilateral, pulley-height and attachment differences.

## Acceptance Criteria

- Cable is shown as 滑輪 in the Traditional Chinese interface.
- Rope is used only for actual rope attachments.
- The 98 cable records have natural Taiwan exercise names.
- All 98 cable records show a movement-appropriate image.
- None of the 68 current generic cable fallbacks remain.
- Re-importing wger does not undo reviewed names or images.
- Existing English mode, favorites, search and add-to-training behavior remain unchanged.

## References

- Life Fitness Traditional Chinese support uses 滑車 for adjustable pulley equipment:
  https://support.lifefitness.com/hc/zh-tw/articles/28330993279127
- Matrix Traditional Chinese equipment material uses 滑輪下拉 and 坐姿划船:
  https://images.jhtassets.com/d37094b88ae47b1730d0cc794c28adb651387a23/original/named/VersaComboLatPulldownSeatedRow%2B61632%2Bzht%2Btw%2B.pdf

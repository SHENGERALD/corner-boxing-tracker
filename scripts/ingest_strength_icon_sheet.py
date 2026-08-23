import json
import sys
from pathlib import Path

from PIL import Image


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: ingest_strength_icon_sheet.py BATCH_INDEX SHEET_PATH")

    root = Path.cwd()
    batch_index = int(sys.argv[1])
    sheet_path = Path(sys.argv[2]).expanduser().resolve()
    manifest_path = root / "scripts" / "strength-icon-batches.json"
    assignments_path = root / "scripts" / "strength-icon-assignments.json"
    manifest = json.loads(manifest_path.read_text())
    batch = manifest["batches"][batch_index]
    sheet = Image.open(sheet_path).convert("RGB")
    if sheet.width != sheet.height:
        raise ValueError(f"sheet must be square, got {sheet.width}x{sheet.height}")

    assignments = json.loads(assignments_path.read_text()) if assignments_path.exists() else {}
    cell = sheet.width / 3
    for index, item in enumerate(batch["items"]):
        row, column = divmod(index, 3)
        crop = sheet.crop((round(column * cell), round(row * cell), round((column + 1) * cell), round((row + 1) * cell)))
        output_dir = root / "public" / "assets" / "strength" / "reviewed" / "generated" / item["category"]
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f'{item["id"]}.webp'
        crop.save(output_path, "WEBP", quality=86, method=6)
        assignments[item["id"]] = {
            "imageUrl": f'/assets/strength/reviewed/generated/{item["category"]}/{item["id"]}.webp',
            "imageSource": "Corner generated",
            "batch": batch_index,
            "panel": index + 1,
        }

    assignments_path.write_text(json.dumps(assignments, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"batch": batch_index, "items": len(batch["items"]), "assignments": len(assignments)}, indent=2))


if __name__ == "__main__":
    main()

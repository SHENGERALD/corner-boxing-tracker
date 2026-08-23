import json
import sys
from pathlib import Path

from PIL import Image, ImageOps


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: crop-strength-correction-sheet.py MANIFEST_PATH OUTPUT_ROOT")

    manifest = json.loads(Path(sys.argv[1]).read_text())
    output_root = Path(sys.argv[2])

    for sheet_spec in manifest["sheets"]:
        sheet = Image.open(sheet_spec["path"]).convert("RGB")
        if sheet.width != sheet.height:
            raise ValueError(f"sheet must be square: {sheet_spec['path']}")

        cell = sheet.width / 3
        for item in sheet_spec["items"]:
            panel_index = item["panel"] - 1
            row, column = divmod(panel_index, 3)
            left = round(column * cell)
            top = round(row * cell)
            right = round((column + 1) * cell)
            bottom = round((row + 1) * cell)
            inset_left, inset_top, inset_right, inset_bottom = item.get("inset", [0, 0, 0, 0])
            crop = sheet.crop((
                left + inset_left,
                top + inset_top,
                right - inset_right,
                bottom - inset_bottom,
            ))
            if any((inset_left, inset_top, inset_right, inset_bottom)):
                crop = ImageOps.pad(crop, (round(cell), round(cell)), color=(0, 0, 0), centering=(0.5, 0.5))
            output_dir = output_root / item["category"]
            output_dir.mkdir(parents=True, exist_ok=True)
            crop.save(output_dir / f"{item['id']}.webp", "WEBP", quality=88, method=6)

    print(json.dumps({"sheets": len(manifest["sheets"]), "items": sum(len(sheet["items"]) for sheet in manifest["sheets"])}))


if __name__ == "__main__":
    main()

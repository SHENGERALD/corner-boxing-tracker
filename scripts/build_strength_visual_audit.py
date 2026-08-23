from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import urllib.request
from collections import Counter
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
CATALOG_DIR = ROOT / "src" / "domain" / "strengthCatalog" / "generated"
OVERRIDES_PATH = ROOT / "src" / "domain" / "strengthCatalog" / "reviewedOverrides.json"


def read_catalog() -> list[dict]:
    overrides = json.loads(OVERRIDES_PATH.read_text())
    records: list[dict] = []
    for catalog_path in sorted(CATALOG_DIR.glob("*.ts")):
        if catalog_path.name == "manifest.ts":
            continue
        source = catalog_path.read_text()
        payload = re.sub(r"^export const records = ", "", source)
        payload = re.sub(r";\s*$", "", payload)
        for record in json.loads(payload):
            records.append({**record, **overrides.get(record["id"], {})})
    return records


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def image_path(image_url: str, cache_dir: Path, fetch_external: bool) -> Path | None:
    if not image_url.startswith("/"):
        if not fetch_external or not image_url.startswith(("http://", "https://")):
            return None
        suffix = Path(image_url.split("?", 1)[0]).suffix or ".img"
        cache_path = cache_dir / f"{hashlib.sha256(image_url.encode()).hexdigest()}{suffix}"
        if not cache_path.exists():
            cache_dir.mkdir(parents=True, exist_ok=True)
            request = urllib.request.Request(image_url, headers={"User-Agent": "CornerStrengthAudit/1.0"})
            temporary_path = cache_path.with_name(f"{cache_path.name}.{os.getpid()}.part")
            try:
                with urllib.request.urlopen(request, timeout=20) as response:
                    temporary_path.write_bytes(response.read())
                with Image.open(temporary_path) as downloaded:
                    downloaded.verify()
                temporary_path.replace(cache_path)
            finally:
                temporary_path.unlink(missing_ok=True)
        return cache_path
    return ROOT / "public" / image_url.lstrip("/")


def wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textlength(candidate, font=font) <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines[:2]


def build_pages(records: list[dict], output_dir: Path, page_size: int = 16, fetch_external: bool = False) -> dict:
    columns = 4
    rows = page_size // columns
    cell_width = 520
    cell_height = 620
    image_size = 455
    title_font = load_font(24)
    meta_font = load_font(19)
    image_counts = Counter(record.get("imageUrl", "") for record in records)
    index: list[dict] = []
    fetch_errors: list[dict] = []
    cache_dir = output_dir / "_external"

    output_dir.mkdir(parents=True, exist_ok=True)
    for page_number, start in enumerate(range(0, len(records), page_size), start=1):
        page_records = records[start:start + page_size]
        sheet = Image.new("RGB", (columns * cell_width, rows * cell_height), "#f2f0ea")
        draw = ImageDraw.Draw(sheet)
        for item_index, record in enumerate(page_records):
            row, column = divmod(item_index, columns)
            x = column * cell_width
            y = row * cell_height
            draw.rounded_rectangle(
                (x + 8, y + 8, x + cell_width - 8, y + cell_height - 8),
                radius=16,
                fill="#ffffff",
                outline="#c9c6be",
                width=2,
            )
            image_url = str(record.get("imageUrl", ""))
            try:
                movement_path = image_path(image_url, cache_dir, fetch_external)
            except Exception as error:
                movement_path = None
                fetch_errors.append({"id": record["id"], "imageUrl": image_url, "error": str(error)})
            if movement_path and movement_path.exists():
                try:
                    movement = Image.open(movement_path).convert("RGB")
                    movement = ImageOps.contain(movement, (image_size, image_size))
                    image_x = x + (cell_width - movement.width) // 2
                    image_y = y + 20 + (image_size - movement.height) // 2
                    sheet.paste(movement, (image_x, image_y))
                except Exception as error:
                    fetch_errors.append({"id": record["id"], "imageUrl": image_url, "error": str(error)})
                    movement_path = None
            if not movement_path or not movement_path.exists():
                draw.rectangle((x + 30, y + 30, x + 490, y + 470), fill="#f5d5d5")
                draw.text((x + 50, y + 220), "MISSING IMAGE", fill="#a21d2b", font=title_font)

            name = str(record.get("name", {}).get("en", record["id"]))
            title_lines = wrap(draw, name, title_font, cell_width - 36)
            label_y = y + 485
            for line in title_lines:
                draw.text((x + 18, label_y), line, fill="#171717", font=title_font)
                label_y += 29
            shared = image_counts[image_url]
            meta = f'{record["id"]} | {record.get("equipment", "?")} | {record.get("category", "?")}'
            if shared > 1:
                meta += f" | SHARED x{shared}"
            draw.text((x + 18, y + 575), meta, fill="#9b2c1f" if shared > 1 else "#555555", font=meta_font)

            index.append({
                "page": page_number,
                "position": item_index + 1,
                "id": record["id"],
                "name": name,
                "equipment": record.get("equipment"),
                "category": record.get("category"),
                "imageUrl": image_url,
                "sharedCount": shared,
            })

        page_path = output_dir / f"page-{page_number:03d}.jpg"
        sheet.save(page_path, quality=90, optimize=True)

    report = {
        "records": len(records),
        "pages": (len(records) + page_size - 1) // page_size,
        "outputDir": str(output_dir),
        "fetchErrors": fetch_errors,
        "index": index,
    }
    (output_dir / "index.json").write_text(json.dumps(report, indent=2) + "\n")
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--category")
    parser.add_argument("--reviewed-only", action="store_true")
    parser.add_argument("--generated-only", action="store_true")
    parser.add_argument("--fetch-external", action="store_true")
    args = parser.parse_args()

    records = read_catalog()
    if args.category:
        records = [record for record in records if record.get("category") == args.category]
    if args.reviewed_only:
        records = [
            record for record in records
            if "/assets/strength/reviewed/generated/" not in str(record.get("imageUrl", ""))
        ]
    if args.generated_only:
        records = [
            record for record in records
            if "/assets/strength/reviewed/generated/" in str(record.get("imageUrl", ""))
        ]
    records.sort(key=lambda record: (record.get("category", ""), record.get("name", {}).get("en", ""), record["id"]))
    report = build_pages(records, args.output, fetch_external=args.fetch_external)
    print(json.dumps({
        "records": report["records"],
        "pages": report["pages"],
        "outputDir": report["outputDir"],
        "fetchErrors": len(report["fetchErrors"]),
    }, indent=2))


if __name__ == "__main__":
    main()

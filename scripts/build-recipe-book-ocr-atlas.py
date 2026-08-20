#!/usr/bin/env python3
"""Build the offline Recipe Book screenshot icon atlas.

The runtime deliberately receives only an icon path and similarity score from the
native image analyzer. Item identity remains a frontend review decision because
many Black Desert materials share the exact same source icon.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw


SCHEMA_VERSION = 1
TILE_SIZE = 20
COLUMNS = 64
BACKGROUND = (22, 23, 27)

# Runtime My Resources exposes these verified substitution members even when a
# particular member is not a literal input in the normalized recipe snapshot.
# Include every member that has current bundled client artwork so its screenshot
# can reach the exact-material review picker.
VERIFIED_SUBSTITUTION_MEMBER_IDS = frozenset({
    6201, 6202, 6203, 6204, 6205, 6206, 6207, 6208, 6209, 6210, 6211,
    6212, 6213, 6214, 6215, 6216, 6217, 6218, 6219, 6220, 6221, 6222,
    6223, 6224, 6225, 6226, 6227, 6228, 6359,
    7901, 7902, 7903, 7904, 7905, 7906, 7907, 7908, 7909, 7910, 7911,
    7912, 7913, 7914, 7915, 7916, 7917, 7921, 7925, 7953, 7957, 7960,
    7961, 7962,
    7001, 7002, 7003, 7004, 7005, 7006, 7007, 7008, 7009, 7010, 7011,
    7012, 7013, 7014, 7015, 7101, 7102, 7103, 7104, 7105, 7201, 7202,
    7203, 7204, 7205, 7304, 7306, 7307, 7308, 7309, 7311, 7312, 7313,
    7314, 7315, 7316, 7317, 7318, 7319, 7320, 7321, 7322, 7328, 7329,
    7330, 7331, 7333, 7334, 7340, 7341, 7342, 7343, 7345, 7346,
})

REPO_ROOT = Path(__file__).resolve().parents[1]
RECIPE_ROOT = REPO_ROOT / "Source Code" / "Assets" / "RecipeBook"
DATA_PATH = RECIPE_ROOT / "recipes.json"
OUTPUT_DIR = RECIPE_ROOT / "ocr"
ATLAS_PATH = OUTPUT_DIR / "icon-atlas.png"
INDEX_PATH = OUTPUT_DIR / "icon-index.json"


def _fallback_tile() -> Image.Image:
    """Render the repository's simple fallback SVG without an SVG dependency."""

    scale = TILE_SIZE / 64.0
    image = Image.new("RGB", (TILE_SIZE, TILE_SIZE), BACKGROUND)
    draw = ImageDraw.Draw(image)
    cyan = (142, 239, 242)
    border = (50, 98, 107)
    draw.rounded_rectangle(
        (1, 1, TILE_SIZE - 2, TILE_SIZE - 2),
        radius=max(2, round(12 * scale)),
        fill=(10, 26, 34),
        outline=border,
        width=1,
    )
    width = max(1, round(3 * scale))
    points = [(22 * scale, 39 * scale), (26 * scale, 22 * scale),
              (38 * scale, 22 * scale), (42 * scale, 39 * scale)]
    draw.line(points, fill=cyan, width=width, joint="curve")
    draw.line((18 * scale, 43 * scale, 46 * scale, 43 * scale), fill=cyan, width=width)
    draw.line((27 * scale, 29 * scale, 37 * scale, 29 * scale), fill=cyan, width=width)
    radius = max(1, round(3 * scale))
    cx, cy = round(32 * scale), round(18 * scale)
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=cyan)
    return image


def _load_tile(icon_path: str) -> Image.Image:
    # Split the bundle-relative POSIX path so it cannot escape RecipeBook.
    source_path = RECIPE_ROOT.joinpath(*icon_path.split("/")).resolve()
    try:
        source_path.relative_to(RECIPE_ROOT.resolve())
    except ValueError as error:
        raise RuntimeError(f"Ingredient icon escapes RecipeBook: {icon_path}") from error
    if not source_path.is_file():
        raise FileNotFoundError(f"Ingredient icon is missing: {icon_path}")
    if source_path.suffix.lower() == ".svg":
        return _fallback_tile()
    with Image.open(source_path) as source:
        rgba = source.convert("RGBA").resize((TILE_SIZE, TILE_SIZE), Image.Resampling.LANCZOS)
        background = Image.new("RGBA", rgba.size, (*BACKGROUND, 255))
        return Image.alpha_composite(background, rgba).convert("RGB")


def main() -> None:
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    input_ids = {
        str(recipe_input["itemId"])
        for recipe in data["recipes"]
        for recipe_input in recipe["inputs"]
    }
    input_ids.update(
        str(item_id)
        for item_id in VERIFIED_SUBSTITUTION_MEMBER_IDS
        if str(item_id) in data["items"]
    )
    icon_paths = sorted({
        data["items"][item_id]["icon"]
        for item_id in input_ids
        if item_id in data["items"] and data["items"][item_id].get("icon")
    })
    if not icon_paths:
        raise RuntimeError("Recipe Book contains no ingredient icons")

    rows = math.ceil(len(icon_paths) / COLUMNS)
    atlas = Image.new("RGB", (COLUMNS * TILE_SIZE, rows * TILE_SIZE), BACKGROUND)
    for index, icon_path in enumerate(icon_paths):
        tile = _load_tile(icon_path)
        x = (index % COLUMNS) * TILE_SIZE
        y = (index // COLUMNS) * TILE_SIZE
        atlas.paste(tile, (x, y))

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    atlas.save(ATLAS_PATH, format="PNG", optimize=True, compress_level=9)
    index_payload = {
        "schemaVersion": SCHEMA_VERSION,
        "tileSize": TILE_SIZE,
        "columns": COLUMNS,
        "background": list(BACKGROUND),
        "icons": [
            {"icon": icon_path, "index": index}
            for index, icon_path in enumerate(icon_paths)
        ],
    }
    INDEX_PATH.write_text(
        json.dumps(index_payload, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(
        f"Built {len(icon_paths)} Recipe Book ingredient icons: "
        f"{ATLAS_PATH.relative_to(REPO_ROOT)} ({atlas.width}x{atlas.height})"
    )


if __name__ == "__main__":
    main()

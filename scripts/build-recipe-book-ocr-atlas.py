#!/usr/bin/env python3
"""Build the offline Recipe Book screenshot reference icon atlas.

The runtime deliberately receives only an icon path and similarity score from the
native image analyzer. Item identity remains a frontend review decision because
many Black Desert materials share the exact same source icon. The atlas includes
both usable recipe inputs and known output-only items: output icons are negative
references that stop a finished product from being forced onto the nearest
ingredient icon.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw


SCHEMA_VERSION = 2
TILE_SIZE = 20
COLUMNS = 64
BACKGROUND = (22, 23, 27)
FALLBACK_ICON = "icons/item-fallback.svg"
# Ingredient eligibility is deliberately deny-list based. The Recipe Book input
# graph is the authoritative positive signal, so a newly introduced material
# category must not silently disappear from screenshot imports. Only item kinds
# that are intrinsically user-facing equipment or placed decorations are
# excluded even when BDO exposes a dismantling/assembly recipe for them.
OCR_NON_MATERIAL_CATEGORIES = frozenset({"Housing", "PearlGoods"})
OCR_NON_MATERIAL_ITEM_TYPES = frozenset({1, 4})

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
CLIENT_CATALOG_ATLAS_PATH = OUTPUT_DIR / "client-catalog-atlas.png"
CLIENT_CATALOG_INDEX_PATH = OUTPUT_DIR / "client-catalog-index.json"
RETIRED_NEGATIVE_ATLAS_PATH = OUTPUT_DIR / "client-negative-atlas.png"
RETIRED_NEGATIVE_INDEX_PATH = OUTPUT_DIR / "client-negative-index.json"


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


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build the Recipe Book identity atlas and full-client material classifier."
    )
    parser.add_argument(
        "--client-extract-dir",
        required=True,
        type=Path,
        help="Extractor output containing full items.json, asset_redirects.json, and icons/.",
    )
    return parser.parse_args()


def _derived_fish_ids(data: dict) -> set[str]:
    result: set[str] = set()
    items = data["items"]
    for recipe in data["recipes"]:
        if recipe.get("type") != "DRY" or len(recipe.get("inputs", [])) != 1:
            continue
        recipe_input = recipe["inputs"][0]
        if recipe_input.get("count") != 1:
            continue
        fresh_id = str(recipe_input.get("itemId", ""))
        dried_id = str(recipe.get("outputId", ""))
        fresh = items.get(fresh_id, {})
        dried = items.get(dried_id, {})
        fresh_description = str(fresh.get("description", ""))
        if (not str(dried.get("name", "")).startswith("Dried ")
                or "Usage: Fried Fish" not in fresh_description
                or not any(label in fresh_description for label in (
                    "- Common Fish", "- High-quality Fish", "- Rare Fish"
                ))):
            continue
        result.update((fresh_id, dried_id))
    return result


def _safe_extracted_icon(root: Path, value: str) -> tuple[str, Path | None]:
    relative = str(value or "").replace("\\", "/").lower()
    if (not relative.startswith("icons/") or relative.startswith("/")
            or ":" in relative or not relative.endswith(".webp")
            or any(part in ("", ".", "..") for part in relative.split("/"))):
        raise RuntimeError(f"Unsafe extracted client icon path: {value}")
    path = root.joinpath(*relative.split("/")).resolve()
    try:
        path.relative_to(root.resolve())
    except ValueError as error:
        raise RuntimeError(f"Extracted client icon escapes its root: {value}") from error
    return relative, path if path.is_file() else None


def _write_atlas(entries: list[dict], atlas_path: Path, index_path: Path) -> Image.Image:
    rows = math.ceil(len(entries) / COLUMNS)
    atlas = Image.new("RGB", (COLUMNS * TILE_SIZE, rows * TILE_SIZE), BACKGROUND)
    for index, entry in enumerate(entries):
        tile = entry.pop("_tile")
        x = (index % COLUMNS) * TILE_SIZE
        y = (index // COLUMNS) * TILE_SIZE
        atlas.paste(tile, (x, y))
        entry["index"] = index
    atlas.save(atlas_path, format="PNG", optimize=True, compress_level=9)
    index_payload = {
        "schemaVersion": SCHEMA_VERSION,
        "tileSize": TILE_SIZE,
        "columns": COLUMNS,
        "background": list(BACKGROUND),
        "icons": entries,
    }
    index_path.write_text(
        json.dumps(index_payload, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    return atlas


def main() -> None:
    args = _parse_args()
    client_root = args.client_extract_dir.resolve()
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    raw_items = json.loads((client_root / "items.json").read_text(encoding="utf-8"))
    redirects = json.loads((client_root / "asset_redirects.json").read_text(encoding="utf-8"))
    raw_by_id = {str(item.get("id")): item for item in raw_items if item.get("id")}
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
    input_ids.update(_derived_fish_ids(data))
    material_ids = {
        item_id
        for item_id in input_ids
        if (raw_item := raw_by_id.get(item_id))
        and not raw_item.get("ghost")
        and not raw_item.get("equipInfo")
        and str(raw_item.get("category") or "") not in OCR_NON_MATERIAL_CATEGORIES
        and int(raw_item.get("itemType") or 0) not in OCR_NON_MATERIAL_ITEM_TYPES
    }
    # Every bundled item is either a usable input, a verified substitution
    # member, or a known non-input reference (most commonly a crafted output).
    # The frontend owns that positive/negative distinction through
    # resourceItems; native matching only needs the complete reference set.
    icon_paths = sorted({
        item["icon"]
        for item in data["items"].values()
        if item.get("icon") and item["icon"] != FALLBACK_ICON
    })
    if not icon_paths:
        raise RuntimeError("Recipe Book contains no reference icons")

    # Canonicalize every current client icon by its extracted WebP bytes. If a
    # recipe item uses that artwork, retain its bundled content-addressed path so
    # native candidates continue to join directly to frontend resource items.
    source_records: dict[str, dict] = {}
    for item in raw_items:
        item_id = str(item.get("id") or "")
        name = str(item.get("name") or "").strip()
        if not item_id or not name or item.get("ghost") or not str(item.get("icon") or "").strip():
            continue
        redirect = redirects.get(f"urn::item:{item_id}")
        if not redirect:
            continue
        relative, extracted_path = _safe_extracted_icon(client_root, redirect)
        if extracted_path is None:
            continue
        record = source_records.setdefault(relative, {"path": extracted_path, "ids": set()})
        record["ids"].add(item_id)

    full_entries: dict[str, dict] = {}
    for relative, record in source_records.items():
        extracted_path = record["path"]
        ids = record["ids"]
        bundle_paths = sorted({
            data["items"][item_id]["icon"]
            for item_id in ids
            if item_id in data["items"] and data["items"][item_id].get("icon") != FALLBACK_ICON
        })
        if len(bundle_paths) > 1:
            raise RuntimeError(f"One client artwork maps to multiple bundled icons: {relative}")
        icon_path = bundle_paths[0] if bundle_paths else (
            f"icons/items/{hashlib.sha256(extracted_path.read_bytes()).hexdigest()}.webp"
        )
        has_material = bool(ids & material_ids)
        has_non_material = bool(ids - material_ids)
        entry = full_entries.get(icon_path)
        if entry:
            entry["_hasMaterial"] = entry["_hasMaterial"] or has_material
            entry["_hasNonMaterial"] = entry["_hasNonMaterial"] or has_non_material
            continue
        with Image.open(extracted_path) as source:
            if source.width != source.height:
                continue
            rgba = source.convert("RGBA").resize((TILE_SIZE, TILE_SIZE), Image.Resampling.LANCZOS)
            background = Image.new("RGBA", rgba.size, (*BACKGROUND, 255))
            tile = Image.alpha_composite(background, rgba).convert("RGB")
        full_entries[icon_path] = {
            "icon": icon_path,
            "_hasMaterial": has_material,
            "_hasNonMaterial": has_non_material,
            "_tile": tile,
        }

    def material_class(has_material: bool, has_non_material: bool) -> bool | None:
        if has_material == has_non_material:
            return None
        return has_material

    for entry in full_entries.values():
        entry["materialEligible"] = material_class(
            entry.pop("_hasMaterial"), entry.pop("_hasNonMaterial")
        )

    bundled_ids_by_icon: dict[str, set[str]] = {}
    for item_id, item in data["items"].items():
        icon_path = item.get("icon")
        if icon_path and icon_path != FALLBACK_ICON:
            bundled_ids_by_icon.setdefault(icon_path, set()).add(item_id)

    # Preserve three semantic states. Artwork used only by recipe materials is
    # true, known non-material artwork is false, and exact art shared by both is
    # null. Mixed art remains reviewable but can never become an exact automatic
    # identity solely from pixels.
    atlas_entries = []
    for icon_path in icon_paths:
        full_entry = full_entries.get(icon_path)
        if full_entry is not None:
            classification = full_entry["materialEligible"]
        else:
            ids = bundled_ids_by_icon[icon_path]
            classification = material_class(bool(ids & material_ids), bool(ids - material_ids))
        atlas_entries.append({
            "icon": icon_path,
            "materialEligible": classification,
            "_tile": _load_tile(icon_path),
        })

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    # The classifier now compares both classes from one current-client domain;
    # remove the superseded false-only generated pair so it cannot be packaged
    # accidentally by wildcard asset rules.
    for retired_path in (RETIRED_NEGATIVE_ATLAS_PATH, RETIRED_NEGATIVE_INDEX_PATH):
        retired_path.unlink(missing_ok=True)
    atlas = _write_atlas(atlas_entries, ATLAS_PATH, INDEX_PATH)

    # Compare both classes from the same current-client artwork domain. Keeping
    # only current negative tiles here would bias the verifier whenever BDO has
    # recolored or rerendered a legitimate material since the bundled snapshot.
    # Exact shared artwork remains null so pixels alone can never claim whether
    # the usable input or finished/event alias is present.
    client_entries = [entry for _, entry in sorted(full_entries.items())]
    if not client_entries or not any(entry["materialEligible"] is True for entry in client_entries):
        raise RuntimeError("The full client produced no usable material reference icons")
    if not any(entry["materialEligible"] is False for entry in client_entries):
        raise RuntimeError("The full client produced no non-material reference icons")
    client_catalog_atlas = _write_atlas(
        client_entries,
        CLIENT_CATALOG_ATLAS_PATH,
        CLIENT_CATALOG_INDEX_PATH,
    )
    print(
        f"Built {len(icon_paths)} Recipe Book reference icons "
        f"({len(material_ids)} usable material identities): "
        f"{ATLAS_PATH.relative_to(REPO_ROOT)} ({atlas.width}x{atlas.height})"
    )
    print(
        f"Built {len(client_entries)} full-client material-class references: "
        f"{CLIENT_CATALOG_ATLAS_PATH.relative_to(REPO_ROOT)} "
        f"({client_catalog_atlas.width}x{client_catalog_atlas.height})"
    )


if __name__ == "__main__":
    main()

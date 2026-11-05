#!/usr/bin/env python3
"""Builds the pixel-hunter art that isn't copied straight from the pack.

    python3 tools/build-art.py        (from the mod folder; needs Pillow)

1. The six arena backgrounds: each is 160x96 art px composed from the pack's tiles
   (art/tiles/), then desaturated and darkened toward the canvas color so the sprites
   stand out. Written to art/arena/<map>.png.
2. Nearest-neighbour 4x copies of everything drawn larger than 1:1 (arenas, Hunter
   and Monster sprite strips, Monster facesets), in art/x4/ at the same relative
   paths. GPUI scales images with a smooth filter, so a 16 px sprite drawn at 32 px
   blurs; a 4x copy drawn at 2x is an exact 2:1 downscale on a 1x screen and 1:1 on a
   2x screen, so every art pixel stays a crisp square.

Re-runnable: the output depends only on the input PNGs and the tables below, and is
pixel-exact (no filtering anywhere). Herdr caches images by file name, so after
changing an arena, bump ARENA_VERSION here and in arena.js.
"""
import os
import sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ART = os.path.join(HERE, "..", "art")
TILE = 16
W, H = 160, 96
SCALE = 4
ARENA_VERSION = 1

CANVAS = (0x10, 0x1A, 0x24)
SATURATION = 0.55  # keep 55% of the color
SINK = 0.36        # then mix 36% of the way toward the canvas


def tiles(name):
    return Image.open(os.path.join(ART, "tiles", name + ".png")).convert("RGBA")


def cut(sheet, col, row, w=1, h=1):
    return sheet.crop((col * TILE, row * TILE, (col + w) * TILE, (row + h) * TILE))


def fill(img, tile):
    for y in range(0, H, TILE):
        for x in range(0, W, TILE):
            img.alpha_composite(tile, (x, y))


# Props from TilesetNature: (col, row, w, h) in tiles.
ROUND_TREE = (0, 0, 2, 2)
PINE = (2, 0, 2, 2)
DEAD_TREE = (4, 0, 2, 2)
ROOT_TREE = (6, 0, 2, 2)
BIG_ROUND = (3, 18, 3, 3)
PINK_TREE = (0, 18, 3, 3)
BROWN_ROCKS = (12, 5, 4, 3)
GRAY_ROCKS = (16, 5, 4, 3)
BUSH = (1, 10, 1, 1)
GRASS_TUFT = (3, 10, 1, 1)

# Each arena: a ground tile, optional ground details, then props at art px.
# The middle is kept clear: Hunters stand at x 20-62, y 26-77 and the Monster's
# feet are at x 118, y 64; the map name sits bottom-left and HP bottom-right.
ARENAS = {
    "forest": {
        "ground": ("TilesetField", 1, 7),
        "detail": ("TilesetFloorDetail", 1, 2, 32, 24),
        "props": [(PINE, -6, -10), (ROUND_TREE, 18, -14), (ROOT_TREE, 126, -8),
                  (ROUND_TREE, 112, 6), (PINE, -10, 66), (ROOT_TREE, 140, 62)],
    },
    "desert": {
        "ground": ("TilesetField", 1, 1),
        "props": [(BROWN_ROCKS, -8, -26), (DEAD_TREE, 140, -6), (BROWN_ROCKS, 124, 64)],
        "saturation": 0.3, "sink": 0.5,
    },
    "dungeon": {
        "ground": ("TilesetFloor", 11, 18),
        "props": [(GRAY_ROCKS, -10, -26), (GRAY_ROCKS, 118, -28), (DEAD_TREE, -6, 62),
                  (GRAY_ROCKS, 124, 68)],
    },
    "field": {
        "ground": ("TilesetField", 1, 4),
        "detail": ("TilesetNature", *GRASS_TUFT[:2], 40, 30),
        "props": [(ROUND_TREE, -2, -12), (ROUND_TREE, 132, -14), (ROUND_TREE, -8, 64),
                  (ROUND_TREE, 140, 66)],
    },
    "ruins": {
        "ground": ("TilesetField", 1, 13),
        "props": [(GRAY_ROCKS, -14, -26), (DEAD_TREE, 130, -10), (BROWN_ROCKS, -12, 68),
                  (PINK_TREE, 132, 54)],
        "saturation": 0.2, "sink": 0.7,
    },
    "lakeside": {
        "ground": ("TilesetField", 1, 4),
        "lake": (96, 64),
        "props": [(ROUND_TREE, -4, -14), (ROOT_TREE, 128, -10), (ROUND_TREE, -10, 62)],
    },
}


def lake(img, x, y):
    # TilesetWater's 3x3 grass-edged lake at (0,6), stretched by its middle column.
    water = tiles("TilesetWater")
    for j, row in enumerate([6, 7, 7, 8]):
        for i, col in enumerate([0, 1, 1, 1, 2]):
            place(img, cut(water, col, row), x + i * TILE, y + j * TILE)


def place(img, sprite, x, y):
    # alpha_composite needs the source inside the destination, so clip it first.
    sx0, sy0 = max(0, -x), max(0, -y)
    sx1, sy1 = min(sprite.width, W - x), min(sprite.height, H - y)
    if sx1 <= sx0 or sy1 <= sy0:
        return
    img.alpha_composite(sprite.crop((sx0, sy0, sx1, sy1)), (x + sx0, y + sy0))


def mute(img, saturation, sink):
    out = img.convert("RGB")
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b = px[x, y]
            l = 0.299 * r + 0.587 * g + 0.114 * b
            c = [l + (v - l) * saturation for v in (r, g, b)]
            c = [v + (k - v) * sink for v, k in zip(c, CANVAS)]
            px[x, y] = tuple(max(0, min(255, round(v))) for v in c)
    return out


def arena(name, spec):
    img = Image.new("RGBA", (W, H), CANVAS + (255,))
    sheet, col, row = spec["ground"]
    fill(img, cut(tiles(sheet), col, row))
    if "detail" in spec:
        sheet, col, row, dx, dy = spec["detail"]
        d = cut(tiles(sheet), col, row)
        for j, y in enumerate(range(4, H, dy)):
            for x in range(4 + (j % 2) * dx // 2, W, dx):
                place(img, d, x, y)
    if "lake" in spec:
        lake(img, *spec["lake"])
    nature = tiles("TilesetNature")
    for (col, row, w, h), x, y in spec["props"]:
        place(img, cut(nature, col, row, w, h), x, y)
    return mute(img, spec.get("saturation", SATURATION), spec.get("sink", SINK))


def save(img, rel):
    path = os.path.join(ART, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, optimize=False)  # no metadata, same bytes every run
    return path


def x4(img):
    return img.resize((img.width * SCALE, img.height * SCALE), Image.NEAREST)


# Sprite strips and faces drawn above 1:1, copied from the pack's files under art/.
SCALED = [f"chars/{c}/{f}.png" for c in ("Knight", "SorcererBlack", "Hunter", "NinjaMasked", "Monk", "Samurai")
          for f in ("Idle", "Attack", "Item", "Jump")]
SCALED += [f"boss/{b}/{f}" for b, idle in (("GiantRacoon", "Idle.png"), ("DemonCyclop", "Idle.png"),
                                           ("GiantSpirit", "Idle.png"), ("TenguBlue", "Idle.png"),
                                           ("GiantRedSamurai", "Idle.png"), ("GiantFrog", "Idle40x40.png"))
           for f in (idle, "Faceset.png")]


def main():
    for name, spec in ARENAS.items():
        img = arena(name, spec)
        print(save(img, f"arena/{name}.png"))
        print(save(x4(img), f"x4/arena/{name}-v{ARENA_VERSION}.png"))
    for rel in SCALED:
        img = Image.open(os.path.join(ART, rel)).convert("RGBA")
        print(save(x4(img), f"x4/{rel}"))


if __name__ == "__main__":
    sys.exit(main())

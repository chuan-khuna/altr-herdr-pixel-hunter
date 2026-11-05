# Art credits

Every image under `art/` comes from the **Ninja Adventure Asset Pack** by
**pixel-boy** (https://pixel-boy.itch.io/) and **AAA**
(https://www.instagram.com/challenger.aaa/), released under
**CC0 1.0 Universal** (public domain dedication,
https://creativecommons.org/publicdomain/zero/1.0/). Attribution is not
required, but given gladly.

Taken from the official zip `Ninja Adventure - Asset Pack.zip` on the pack
page https://pixel-boy.itch.io/ninja-adventure-asset-pack (downloaded
2026-11-05, sha256 `95a06f4fdcfd1882f061a45ff313b7c905dbe2de1e8512b281d7937df62a7b15`).
Files are copied pixel-exact, unchanged, at their pack paths:

| Here | In the pack | Used as |
| --- | --- | --- |
| `chars/Knight/Faceset.png` | `Actor/Character/Knight/Faceset.png` | Knight face |
| `chars/SorcererBlack/Faceset.png` | `Actor/Character/SorcererBlack/Faceset.png` | Mage face |
| `chars/Hunter/Faceset.png` | `Actor/Character/Hunter/Faceset.png` | Archer face |
| `chars/NinjaMasked/Faceset.png` | `Actor/Character/NinjaMasked/Faceset.png` | Rogue face |
| `chars/Monk/Faceset.png` | `Actor/Character/Monk/Faceset.png` | Monk face |
| `chars/Samurai/Faceset.png` | `Actor/Character/Samurai/Faceset.png` | Samurai face |
| `boss/GiantRacoon/Faceset.png` | `Actor/Boss/GiantRacoon/Faceset.png` | Forest: Giant Racoon |
| `boss/DemonCyclop/Faceset.png` | `Actor/Boss/DemonCyclop/Faceset.png` | Desert: Demon Cyclops |
| `boss/GiantSpirit/Faceset.png` | `Actor/Boss/GiantSpirit/Faceset.png` | Dungeon: Giant Spirit |
| `boss/TenguBlue/Faceset.png` | `Actor/Boss/TenguBlue/Faceset.png` | Field: Blue Tengu |
| `boss/GiantRedSamurai/Faceset.png` | `Actor/Boss/GiantRedSamurai/Faceset.png` | Ruins: Red Warlord |
| `boss/GiantFrog/Faceset.png` | `Actor/Boss/GiantFrog/Faceset.png` | Lakeside: Giant Frog |

All facesets are 38×38 px.

Added for the arena (ticket 04), same zip, copied pixel-exact and unchanged:

| Here | In the pack | Used as |
| --- | --- | --- |
| `chars/<Char>/Idle.png`, `Attack.png`, `Item.png`, `Jump.png` | `Actor/Character/<Char>/SeparateAnim/<same>.png` | arena poses for the six Classes (64x16 strips, directions down/up/left/right; Item is 16x16) |
| `boss/<Boss>/Idle.png` (Frog: `Idle40x40.png`) | `Actor/Boss/<Boss>/<same>` | Monster Idle strips: Racoon 6x60, Cyclop 5x50, Spirit 5x50, Tengu 6x68, Red Samurai 12x48, Frog 5x40 |
| `tiles/TilesetNature.png`, `TilesetField.png`, `TilesetFloor.png`, `TilesetFloorDetail.png`, `TilesetWater.png`, `TilesetDungeon.png` | `Backgrounds/Tilesets/<same>` | sources for the arena backgrounds |

Added for Monster HP, Slain and Respawn (ticket 05), copied pixel-exact and unchanged:

| Here | In the pack | Used as |
| --- | --- | --- |
| `boss/<Boss>/Hit.png` (Cyclop, Spirit, Tengu, Red Samurai, Frog) | `Actor/Boss/<Boss>/Hit.png` | Monster Hit strips: Cyclop 3x50, Spirit 3x50, Tengu 8x68, Red Samurai 8x48, Frog 3x40 |
| `boss/GiantRacoon/Attack.png` | `Actor/Boss/GiantRacoon/Attack.png` | the Racoon has no Hit strip, so its Attack (4x60) plays instead |

These six files were not taken from the official zip but from the copy of the same pack
in this repo's `docs/records/2026-11-05-preview/na/` (a public mirror,
github.com/MarioLDD/Kuroshiro-adventure). Every file that copy shares with the official zip
(the six Monster faces and Idle strips, and the Knight, Hunter and Monk faces and poses,
27 files) is byte-identical to it. Check them against the zip when it is at hand.

Made from those by `tools/build-art.py` (derived, still CC0):

- `arena/<map>.png`: the six 160x96 arena backgrounds composed from the tilesets,
  then desaturated and darkened toward the canvas `#101a24`.
- `x4/...`: nearest-neighbour 4x copies of the arenas (`x4/arena/<map>-v<N>.png`),
  the sprite strips above and the Monster facesets, so they stay crisp when drawn
  at 2x (GPUI scales images smoothly).

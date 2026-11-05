# 04: Arena scene with Hunter animation

**What to build:** The top of the sidebar shows a top-down arena of the current Area's map. The background is 160×96 art px, shown at 2×. The Monster stands on the right playing its Idle strip, aligned by its feet. Up to four Hunters stand on the left facing it, picked by priority (Needs help, Hunting, Cleared, Resting), with `+N` for the rest. Each Hunter animates by state:

- Hunting swaps Idle and Attack with a 6 px lunge.
- Needs help shows the Item pose with a blinking `!`.
- Cleared hops once, then idles.
- Resting idles with a floating `z`.

A build script composes the six arena backgrounds from the pack's tiles, then desaturates and darkens them toward the canvas. The arena redraws nothing while no Hunter is Hunting or Needs help.

**Blocked by:** 03

**Status:** done

- [x] Switching spaces switches the arena map and Monster
- [x] The arena shows at most four Hunters chosen by priority and `+N` for the rest (covered by a hunt model test)
- [x] Each state animates as described, using one-shot timers and native loops only (no repeating timer)
- [x] With every Hunter Resting or Cleared and nothing animating, the mod schedules no further redraws
- [x] The arena background script is re-runnable and its output is pixel-exact; arenas look muted next to the sprites
- [x] All sprites render with nearest-neighbour scaling (no blur)
- [x] `herdr-app check` passes; a `herdr-app shot` matches the arena in the preview record

## Comments

- Done in the live config, then `scripts/sync.sh`. New in `mods/pixel-hunter/`:
  - `arena.js`: the arena view, drawn by the `sidebar` role above the Area list. It shows the current Area (the first if none is current): background, Monster, up to four Hunters, a `Forest · Giant Racoon` caption bottom-left (12 px, `canvas` at `cc` alpha) and a `+N` chip top-left. The scene is 320x192 logical (160x96 art px at 2x) plus a 2 px `border` line. It is centered in the sidebar, with `canvas` on either side if the sidebar is wider than 320.
  - `hunt.js`: `ARENA_MAX = 4` and `arenaPick(hunters, max)`. Each Area now has `arena: { hunters, more }`, sorted most urgent first (help > hunting > cleared > resting) with ties kept in order. Two new tests (14 in total): the pick plus `+N`, and the current Area's own map and Monster.
  - `tools/build-art.py` (python3 + Pillow, run from the mod folder) composes `art/arena/<map>.png` (160x96) from `art/tiles/`. The `ARENAS` table lists the ground tile, the details and the props for each map. Muting keeps 55% of the saturation, then mixes 36% toward `#101a24`. Desert uses 30% / 50% and Ruins 20% / 70%. The script also writes `art/x4/`, nearest-neighbour 4x copies of the arenas (`x4/arena/<map>-v1.png`), the Hunter strips and the Monster Idle strips and facesets. It is re-runnable: two runs give byte-identical files, and every x4 file is an exact 4x of its source.
  - Art from the same official zip (sha256 unchanged): `chars/<Char>/{Idle,Attack,Item,Jump}.png` from `SeparateAnim/`, `boss/<Boss>/Idle.png` (Frog: `Idle40x40.png`), and six tilesets in `art/tiles/`. `art/CREDITS.md` lists them.
- Animation, all native, no repeating timer:
  - Hunting: Idle at x and Attack at x+6, each shown 520 ms (`SWAP_MS` 1040). Needs help: the Item pose with `!` in `blocked` 20 px, blinking via `.frames(["!", " "], 400)`. Resting: Idle with a `z` (`dim`, 14 px). Cleared: one hop of 12 px up and down with the Jump frame, using a `top` transition (180 ms) and two `cx.timer.after` one-shots, then Idle. A Hunter that is already Cleared when the mod starts doesn't hop.
  - Monster: plays its Idle strip at 160 ms per frame, there and back (0..N-1..0). The frames are stacked, and each sits inside two nested linear opacity loops. GPUI clamps opacity outside 0..1, so a loop from -1000*a to 1000*(1-a) works as a square wave, and the nested pair shows one frame at a time. Loops started in one render share their phase (checked over 8 shots: never two frames at once, never none). The feet sit on y 128 at x 236, using each strip's lowest opaque row (`MONSTER_ART.feet`).
  - Calm: when the Area's Party has nobody Hunting or Needing help, the scene is built with no loops and no frames: the Monster's first frame, a still `z`, Cleared in Idle. Checked with shots every 65 ms for 4 s after the Party turned calm: 0 changed pixels.
- Deviations:
  - The spec says the `z` floats. It floats only while the arena is awake (someone Hunting or Needing help). With everyone Resting it holds still, because the calm arena must redraw nothing.
  - GPUI scales images smoothly. A 16 px sprite drawn at 32 px came out blurry (611 colors in one sprite), so every image drawn above 1:1 uses a 4x file from `art/x4/`. Checked on a shot: every 2x2 block of the arena, sprites included, is a single color (0 of 15360 blocks differ outside the caption text).
  - The arena backgrounds follow the preview record's arrangement (ground plus corner props) but were rebuilt from the official tiles, so they aren't byte-identical to `docs/records/2026-11-05-preview/arena-*.png`. Mean colors are within about 10 of the record on each channel.
- For ticket 05 (Monster HP/Slain/Respawn):
  - Hook into `monster(area, active)` in `arena.js`. Add a `mode` branch there for hit, slain and idle (`area.mode` from the hunt model). The Hit strips aren't copied yet: add `boss/<Boss>/Hit.png` (Racoon has no Hit; the mock used `Attack.png`) to `SCALED` in `tools/build-art.py`, re-run it, and add the strip sizes to `MONSTER_ART`. Shake is a native `loop("left", ...)`. Fall and fade are one-shot `transition("top"/"opacity")`.
  - The HP bar goes in the arena box bottom-right (mock: right 12, bottom 8, width 110, 8 px bar, `hp` color). The caption already sits bottom-left.
  - Keep the calm rule: `active` is computed in `arena()`. Hit should play only while someone is Hunting. Slain is a one-shot, then still.
  - Hop detection keeps `self.hop.seen` (terminal -> state). A similar per-Area map could detect Respawn and Slain changes for one-shot effects.
- Verified: `node --test` 14/14; `herdr-app check` passes; `layout.switch pixel-hunter` ok; `herdr-app status` errors `[]`. Shots of the live window (two Hunting Hunters, Forest) and of the demo snapshot show all four states in priority order (Needs help, Hunting, Cleared, Resting) and match the arena in `docs/records/2026-11-05-preview.html` apart from the HP bar (ticket 05). A demo with `d3` current switched the arena to Dungeon and Giant Spirit. A temporary demo with 6 Hunters showed `+2` and the hop.

# 03: Random Respawn

**What to build:** An Area's first Monster is still its map's own. After a Monster is Slain, the next Respawn picks one of the other five Monsters at random. The current Monster is kept across restarts, like HP. The arena sprite, the arena caption (`Forest · Giant Frog`) and the Area row's face all show the current Monster.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `hunt()` accepts an injected `random` function (default `Math.random`), used only for Respawn picks
- [x] Hunt model tests:
  - The first Monster is the map's own.
  - With an injected `random`, Respawn never repeats the Slain Monster and can pick any of the other five.
  - Persisted state without a Monster id still gives the map's own Monster.
- [x] After a restart the respawned Monster is unchanged
- [x] After a Respawn, a live or demo screenshot shows the same Monster in the arena sprite, the caption and the Area row face
- [x] `node --test` and `herdr-app check` pass

## Comments

- Done in the live config, then `scripts/sync.sh`.
  - `hunt.js`: `hunt()` takes `random` (default `Math.random`; a non-function falls back to it), passed only to the Respawn step. New exports: `MONSTERS` (the six, in map order) and `respawnPick(slain, random)`, which returns one of the other five, `floor(random() × 5)`, clamped so 1, negatives or NaN still give one of them. A Monster record is now `{ hp, since, slain, id? }`. A Respawn writes `id`, and every other step keeps it. With no `id` (old state, or an unknown id, which is dropped) the Area's Monster is its map's own. So the first Monster always follows the map, and nothing new is written until a Respawn. Each Area's `monster` is now the current Monster, not `map.monsters[0]`. It stays an object `{ id, name }` (as `areas.js` and `arena.js` already read it), not a bare id, so the caption keeps its name.
  - `arena.js` and `areas.js` needed no code change: the sprite, the caption `<map> · <monster>` and the row face already read `area.monster`. Only a comment in `arena.js` changed. The Monster's body element id carries the Monster id, so a Respawn draws the new Monster standing; the old "fall runs back up" no longer happens.
  - `demo.js`: Login fix (Dungeon) has had a Respawn (`id: "GiantFrog"`), so the demo shows a Monster that isn't its map's own.
  - `RECIPE.md`: updated from the files: the maps and their own Monsters, the caption, Respawn, restarts, the `hunt()` signature, the state shape and the test count (53).
- 4 new tests (53 in all):
  - The first Monster is the map's own for seven spaces, and `random` is never called without a Respawn.
  - With `random` at the middle of each fifth, the Respawn after the Giant Racoon gives each of the other five. Over six Slain/Respawn rounds with `random` at 0, 0.999999, 1, NaN and -3, no Respawn repeats the one just Slain.
  - Between Respawns (wear, Needs help, Resting, Slain) the Monster and its id stay, and `random` isn't called.
  - The respawned id survives JSON and an empty first render. Old state without an id, or with an unknown id, gives the map's own.
- Verified: `node --test` 53/53; `herdr-app check` passes; `herdr-app status` errors `[]`. Live, in a temporary space `ph03` (2nd space, Desert) running a Git Bash fake agent that prints OSC 7501 `state=` from a file. Shots in `03-shots/`:
  - `live-1-hunting-own.png`: Hunting, the Desert's own Demon Cyclops in the arena, the caption and the row face. `shared.json` had no `id`.
  - `live-2-slain.png`, then `live-3-respawn-frog.png`: `done` (Slain), then `working`. `shared.json` got `{ hp: 100, …, id: "GiantFrog" }`, and the arena sprite, `Desert · Giant Frog` and the row face all show the Giant Frog.
  - Restart: `layout.switch main` and back, which starts the mods fresh from the saved shared state (as in the first spec's ticket 05). `live-4-after-restart.png` still shows the Giant Frog in all three places, `id` unchanged.
  - `live-5-frog-slain.png`, then `live-6-respawn-again.png`: a second round. The Slain Frog was replaced by the Demon Cyclops (the map's own can come back; only the one just Slain can't).
  - `demo-sidebar.png`: the demo snapshot, cropped to the sidebar (the layout's sidebar props got `"demo": true` for the shot, then the layout file was restored byte for byte, checked with `cmp`). Login fix's row face is the Giant Frog.
  - Afterwards I closed `ph03` and focused the pane I started on (`t9`).
- Not verified:
  - A full Herdr app restart (the window was in use). Persistence is the on-disk `shared.json`, covered by the model test and the layout switch above.
  - In the demo, the arena shows the current Area (shop-api, Forest, its own Racoon), so the demo shot shows the respawned Monster only in the row face. The live shots cover arena, caption and face together.

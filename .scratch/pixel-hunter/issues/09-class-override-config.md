# 09: Class override config

**What to build:** The user can pin a Class to a tab name in a small config file that lives with the mod (for example, tab `api` is always Mage). Pinned tabs keep their Class when tabs are closed or reordered. Unpinned Hunters still get Classes in order. An unknown Class name in the config is ignored and doesn't break the sidebar.

**Blocked by:** 03

**Status:** done

- [x] Hunt model tests cover an override, an override mixed with ordered assignment, and an invalid Class name
- [x] Editing the config updates the sidebar without restarting Herdr
- [x] The README documents the config
- [x] `herdr-app check` passes

## Comments

- Done in the live config, then `scripts/sync.sh`. New and changed in `mods/pixel-hunter/`:
  - `classes.json` (new): `{ "tabs": { "<tab name>": "<Class>" } }`. It ships as `{ "tabs": {} }` (JSON has no comments; the README has the example).
  - `hunt.js` (still no Herdr imports): new input `pins` (the parsed file) and tab `name`/`named` on `spaces[].tabs`. `classPins(cfg)` (exported) gives a Map of lower-cased tab name to Class: tab and Class names are trimmed and matched ignoring case (`"mage"` is Mage). An empty name, an unknown Class, a non-string value, `tabs` that isn't an object, or a broken file pins nothing, and the first of two keys that differ only in case wins. Only tabs with `named: true` match, because an unnamed tab's name is its position ("2"), which changes on a move. `assignClasses` gives a pinned Hunter its pin, **even over the Class it had before**, and stores it in `state.classes` like any other. The pin counts as a use, so unpinned Hunters still go least-used-first in Class order and avoid the pinned Classes until all six are used. A malformed `state.classes` is now ignored too.
  - `pins.js` (new adapter): `startPins(self, cx)` reads `classes.json` once per mod load into `self.pins`, like `rank.json`. Saving any file in the mod folder reloads every copy, so an edit shows at once. No watch and no timer were needed: `watchFolder` in `sessions.js` is for the sessions data folder, which isn't in the mod folder.
  - Every role that calls `world()` (sidebar, tabs, pane header) runs `startPins` in its init. They all write the same `state.classes`, so they must agree on the pins. The tabs role had no session reader and still doesn't need one.
  - `world.js` passes `t.name`/`t.named` and `self.pins` (demo mode too). Until the read finishes, `self.pins` is `undefined` and `world()` **writes no persisted state**. Without that, a copy that hadn't read the file yet would store a pinned Hunter's ordered Class and fight the copies that had. Hunters already known show their stored Class during that moment, which already holds the pin.
  - Tests (`test/hunt.test.js`, 4 new, 46 total with the statusline ones): a pin, also when the tab comes back as a new terminal and is moved first, winning over a stored Class, and matching `" API "`/`"mage"`; pins mixed with ordered assignment (`[unnamed, api=Knight, docs=Mage, unnamed]` gives Archer, Knight, Mage, Rogue) and an unnamed tab's position not matching; unknown Class / bad value / array / null / string / empty-name configs leaving the order unchanged, a good entry beside a bad one still working, and `classPins` case handling; the shipped `classes.json` parses and pins nothing.
  - README: new section "Pin a Class to a tab".
- Verified: `node --test` 46/46; `herdr-app check` passes; `herdr-app status` errors `[]` throughout. In the real window, with a temporary space `ph09test` and three fake agents (Git Bash `-l` OSC 7501 loops) in tabs `api`, `web` and an unnamed one:
  1. With no pins they took Archer, Rogue, Monk after the two existing Hunters.
  2. Saving `{ "tabs": { "api": "Samurai", "web": "Paladin" } }` turned the api Hunter into Samurai in the sidebar, the arena, the tab face and the pane header within 3 s, with no restart. web's unknown Paladin was ignored (it stayed Rogue).
  3. Closing the api tab and opening a new `api` tab (new terminal, now last) gave Samurai again. `tab.move` to position 1 kept it.
  4. A truncated `classes.json` kept everything drawing with no errors, and the Samurai kept its Class from the stored state.
  Afterwards I put back `{ "tabs": {} }`, closed the space and restored space, tab and focus. `state.classes` ended as it started (`t6` Knight, `t9` Mage).
- **Decisions to review:**
  - A pin wins over a Class the Hunter already had, so pinning a running tab changes its look at once. The other option was to apply pins only to new Hunters.
  - Removing a pin (or breaking the file) keeps the Hunter's current Class until it closes, instead of re-ordering it.
  - Pinned Classes count as in use, so unpinned Hunters spread over the free ones. The ticket's "still get Classes in order" could also be read as ignoring pins entirely.
  - Matching is by tab name across all spaces, so `api` in two spaces pins both. A space-qualified key wasn't needed.
  - Only named tabs match, so `"2"` never pins by position.
- Not verified: a full Herdr app restart (pins are re-read on every mod load, the same path as the save reload above), and renaming a tab by hand with `tab.rename` (the snapshot is rebuilt on every render, so the name is read live).
- For ticket 10 (publish):
  - `classes.json` must be in the shared mod folder (sync copies it) and should stay `{ "tabs": {} }`, not the test pins.
  - RECIPE **How it behaves**: Classes in order of first appearance, kept while alive; `classes.json` pins a Class to a named tab (case-insensitive, any space), a pin wins, unknown Classes are ignored, and saving reloads the mod. **Built from**: list `classes.json` and `pins.js` next to `rank.json`/`sessions.js`. **Watch out**: an unnamed tab never matches (its name is its number), and a removed pin leaves the current Class in place until the Hunter closes.

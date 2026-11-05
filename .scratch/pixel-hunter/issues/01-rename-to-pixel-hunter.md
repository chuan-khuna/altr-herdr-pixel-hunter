# 01: Rename monster-hunter to pixel-hunter

**What to build:** Prefactor before any layout work. Everything in the repo that names the layout `monster-hunter` uses `pixel-hunter` instead: the shared folder, the sync script's layout name and mod prefix, the AGENTS.md guidance and the README. The sync script still runs correctly after the rename. It reports that no live layout exists yet, which is expected. The repo directory and the git history are not renamed here.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] The shared folder is called `pixel-hunter` and keeps its RECIPE.md stub and empty layouts/mods folders
- [x] The sync script copies layout `pixel-hunter` and mods prefixed `pixel-hunter`
- [x] AGENTS.md and README describe the layout as `pixel-hunter`, a monster-hunting pixel RPG layout with original characters
- [x] No remaining `monster-hunter` reference except the repo/directory name and references/
- [x] Running the sync script prints its "no layout yet" message and exits non-zero without creating stray files

## Comments

- Done: `git mv monster-hunter pixel-hunter` (RECIPE.md stub + `.gitkeep`s kept), sync script `NAME=pixel-hunter`, AGENTS.md and README now describe pixel-hunter as a monster-hunting 8-bit pixel RPG layout with original characters; RECIPE title is "Pixel Hunter".
- Remaining `monster-hunter` hits are only the repo directory name (`herdr-monster-hunter` in AGENTS.md title and the docs/records mocks) and the spec/ticket text describing this rename.
- `scripts/sync.sh` prints `no ~/.config/herdr-app/layouts/pixel-hunter.json yet` and exits 1 with no files created. Also tested with a fake `HERDR_HOME`: copies `pixel-hunter.json` and only `pixel-hunter*` mods, drops `jsconfig.json`.
- Note for later tickets: a real sync `rm -rf`s `pixel-hunter/layouts` and `mods`, deleting their `.gitkeep`s. That's harmless once real files exist.

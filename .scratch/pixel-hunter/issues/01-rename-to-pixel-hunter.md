# 01: Rename monster-hunter to pixel-hunter

**What to build:** Prefactor before any layout work. Everything in the repo that names the layout `monster-hunter` uses `pixel-hunter` instead: the shared folder, the sync script's layout name and mod prefix, the AGENTS.md guidance and the README. The sync script still runs correctly after the rename. It reports that no live layout exists yet, which is expected. The repo directory and the git history are not renamed here.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The shared folder is called `pixel-hunter` and keeps its RECIPE.md stub and empty layouts/mods folders
- [ ] The sync script copies layout `pixel-hunter` and mods prefixed `pixel-hunter`
- [ ] AGENTS.md and README describe the layout as `pixel-hunter`, a monster-hunting pixel RPG layout with original characters
- [ ] No remaining `monster-hunter` reference except the repo/directory name and references/
- [ ] Running the sync script prints its "no layout yet" message and exits non-zero without creating stray files

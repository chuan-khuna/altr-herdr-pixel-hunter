# 10: Publish to herdr.dev/layouts

**What to build:** Follow the repo's publishing checklist. Sync the live layout, theme, mod, fonts and art into the shared folder. Write RECIPE.md from the real files, in Herdr's order: Name + paragraph + image, What you see, How it behaves, Built from, Watch out, Done when. Use exact values and leave no TODO. Take preview.png from a real window. Add a license, the art credits (Ninja Adventure, CC0) and the font licenses (OFL). Push to a public GitHub repo and add the `herdr-layout` topic.

**Blocked by:** 05, 06, 07, 08, 09

**Status:** ready-for-human (everything up to the push is done; pushing, making the repo public and adding the topic wait for the user)

- [x] `herdr-app check` passes for the mod and `layout.switch pixel-hunter` shows the full layout
- [x] A clean install from the shared folder alone (following its README) reproduces the layout
- [x] RECIPE.md lists shipped mods (`files`, `changes`, etc.) by name only, never copies them
- [x] preview.png is a real `herdr-app shot` with several Areas and Hunters in mixed states
- [ ] The repo is public, has the `herdr-layout` topic, and contains no references/ clones or preview-only mirror assets (not done: the push, visibility and topic are left for the user to approve; see Comments)

## Comments

- Done in this order: `herdr-app check` (passes), `node --test` (48/48), `layout.switch pixel-hunter` (ok, `herdr-app status` errors `[]`), then `scripts/sync.sh`. The live config and `pixel-hunter/` were already identical apart from the generated `gpui-kit.d.ts` / `jsconfig.json`, so the sync changed no tracked file. `classes.json` is `{ "tabs": {} }` and `data/pixel-hunter/sessions/` holds no test records.
- **RECIPE.md** rewritten from the real files in Herdr's order (Name + paragraph + image, What you see, How it behaves, Built from, Watch out, Done when), with no TODO. It describes only what the build does: Respawn brings back the same map's Monster (the random Respawn, Pets, Hunter row F and three-line Area rows of `.scratch/pixel-hunter-pets` aren't built and aren't mentioned). Shipped mods (`files`, `changes`, `menu`, `new-menu`, icons from `mods/pane/` and `mods/tabs/`) are named only, never copied. Built from lists `statusline.mjs`, `rank.json`, `sessions.js`, `classes.json`, `pins.js`. Watch out has the theme copy, the whole-pane peach frame limit, the panel ids, `refreshInterval: 60` / 5-minute limit / `node` on PATH, unnamed tabs never matching pins, the done-to-idle and core-done rule, the 10 s HP one-shot, x4 art, Pixelify quirks and the check's blind spot.
- **README**: the install now copies `themes/*` too (without it the layout names a theme that isn't there), says the fonts may need a restart, and says what the mod reads outside its folder. New License section.
- **Licenses**: no license was stated, so `LICENSE` is MIT, "Copyright (c) 2026 ALTR" (the git author), at the repo root and in `pixel-hunter/LICENSE`, with a note that the art (CC0, `art/CREDITS.md`) and fonts (OFL 1.1, `fonts/OFL-*.txt`) aren't covered by it. Credits and both OFL files were already in the shared folder.
- **preview.png**: a real `herdr-app shot` (2400 x 990) of the window. I made three temporary spaces, `shop-api` (tabs `api` and `web`), `docs-site` and `login-fix`, in scratchpad folders with throwaway git repos, each running a Git Bash `-l` script that prints a short made-up transcript and reports OSC 7501 states. Rank and Stamina came from the real `statusline.mjs` fed by hand per terminal (one record written an hour old for `old`). The shot shows shop-api current (Desert, Demon Cyclops, Hit strip, HP worn) with Hunting, Needs help, Cleared and Resting Hunters, A/B/C grades, blue/cream/old Stamina, the peach row and pane header, the mint focused pane, tab faces and dots, docs-site Slain (empty HP), login-fix Hunting (collapsed) and the user's own space (collapsed rows, `[?] Claude Code`, `STA —`). Afterwards I closed the three spaces, deleted the six session records, and restored space, tab and focused pane; `pixel-hunter.state` dropped the temporary Classes and Monsters by itself.
  - The paths in the shot read `~…scratchpad	10shop-api` (home shown as `~`, no user name). The user's own space shows `D:…altr-herdr-pixel-hunter`. No terminal content from the user's real sessions is visible.
  - `state=…;app=claude-code` in one OSC 7501 report gave no status at all, so the fake agents report no `app`; that's why they needed records to show a Rank.
- **Clean install check**: copied only `pixel-hunter/layouts`, `themes` and `mods` into an empty temporary home and ran `HERDR_APP_HOME=<it> herdr-app check <it>/mods/pixel-hunter` (passes) and `node --test` there (48/48). Then checked by script that every image and icon path the code builds exists in that copy (6 Monster faces and their x4 copies, 24 x4 Hunter strips, 12 x4 Monster strips, 6 x4 arenas, 5 icons) and that every shipped file it borrows exists in Herdr (`files`, `changes`, `menu`, `new-menu`, `mods/pane/*.svg`, `mods/tabs/win-*.svg`). The layout file refers only to `pixel-hunter`, `files`, `changes` and the `pixel-hunter-night` theme. Not done: launching a second Herdr window on that temporary home, so `layout.switch` was only run on the real home (whose files are byte-identical).
- **Not verified / open**:
  - The six Monster Hit/Attack strips still come from the public mirror copy in `docs/records/2026-11-05-preview/na/`, not the official zip (CREDITS says so). Check them against the zip (sha256 in CREDITS) before or after publishing.
  - The repo (not the shared folder) still holds preview-only mirror assets in `docs/records/2026-11-05-preview/` (the mock's sprites and arenas, CC0) and tracks a `.DS_Store`. `references/` tracks only its README and `.gitignore`. The last box asks for none of these in the repo; decide whether to keep the mock's assets (they're CC0 and the mock needs them) before making it public.
  - The shared folder has no README of its own; the install steps are in the repo README.
- **Left for the user** (outward-facing, not done):
  1. `git push -u origin feat/pixel-hunter-tickets-05-10` and merge to `main` (or push `main`).
  2. `gh repo edit --visibility public --accept-visibility-change-consequences`.
  3. `gh repo edit --add-topic herdr-layout`. It appears at herdr.dev/layouts within the hour.

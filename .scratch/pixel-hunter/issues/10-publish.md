# 10: Publish to herdr.dev/layouts

**What to build:** Follow the repo's publishing checklist. Sync the live layout, theme, mod, fonts and art into the shared folder. Write RECIPE.md from the real files, in Herdr's order: Name + paragraph + image, What you see, How it behaves, Built from, Watch out, Done when. Use exact values and leave no TODO. Take preview.png from a real window. Add a license, the art credits (Ninja Adventure, CC0) and the font licenses (OFL). Push to a public GitHub repo and add the `herdr-layout` topic.

**Blocked by:** 05, 06, 07, 08, 09

**Status:** ready-for-agent

- [ ] `herdr-app check` passes for the mod and `layout.switch pixel-hunter` shows the full layout
- [ ] A clean install from the shared folder alone (following its README) reproduces the layout
- [ ] RECIPE.md lists shipped mods (`files`, `changes`, etc.) by name only, never copies them
- [ ] preview.png is a real `herdr-app shot` with several Areas and Hunters in mixed states
- [ ] The repo is public, has the `herdr-layout` topic, and contains no references/ clones or preview-only mirror assets

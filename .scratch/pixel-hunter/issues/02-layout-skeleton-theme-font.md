# 02: Layout skeleton with theme and font

**What to build:** A live `pixel-hunter` layout in the Herdr config that the user can switch to. It has a 320 px fixed sidebar showing only the logo row ("PIXEL HUNTER" in Press Start 2P), a work column with a 44 px tab bar (Herdr's shipped tabs are fine for now), panes with 2 px square frames and an 8 px gap, and a hidden 360 px side panel for Files/Changes. The whole window uses the `pixel-hunter-night` theme and Pixelify Sans, matching `docs/records/2026-11-05-color-theme.html`. Set up the single `pixel-hunter` mod with roles chosen by props, so later tickets add roles instead of new mods.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `layout.switch pixel-hunter` shows the sidebar, tab bar and panes; `herdr-app status` lists no errors
- [ ] The theme `pixel-hunter-night` uses exactly the spec's token values; focused pane frame is accent (mint)
- [ ] Pixelify Sans (UI) and Press Start 2P (logo) are shipped in the mod's fonts folder with their OFL licenses and render in the window
- [ ] Radius is 0 everywhere; frames are 2 px
- [ ] `herdr-app check` passes for the mod
- [ ] The sync script copies the layout, theme, mod and fonts into the shared folder

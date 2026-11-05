# 02: Three-line Area rows

**What to build:** In the live layout, each Area row shows the 76 px Monster face beside three lines:
1. the space name, with the worst-state dot and `⌃N`
2. the path
3. the branch (`⎇ name`, empty outside git)

The map name and the HP bar leave the row, and the arena keeps them. The path line never shows `undefined`. The result matches the revised Area rows in `docs/records/2026-11-05-preview.html`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Hunt model test: when an Area's first terminal has no cwd, the path falls back to the space folder, then to home, and never contains `undefined`
- [ ] Area rows show three lines with the face spanning all three, and no map name or HP bar
- [ ] An Area outside git shows an empty branch line
- [ ] Collapse/expand, click, right-click and drag still work as before
- [ ] Screenshots of the live window and the demo snapshot match the preview record
- [ ] `node --test` and `herdr-app check` pass

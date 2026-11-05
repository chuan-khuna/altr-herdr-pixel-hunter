# 03: Hunt model and Area list (tracer bullet)

**What to build:** The first end-to-end slice. Below the logo, the sidebar lists every space as an Area, with its Hunters underneath, driven by a pure hunt model with no Herdr imports.

- Area rows have two lines. The first holds the Monster's face, the space name, the map name, a worst-state dot and `⌃N`. The second holds the first terminal's path and branch.
- Hunter rows show a 38 px face, the Class, a state label with its icon, and the program name in place of Rank for now.
- A Hunter that Needs help gets a peach frame.
- Clicking an Area selects its space, right-clicking opens its menu, and dragging reorders.
- Clicking a Hunter focuses its agent.

This ticket brings in the Ninja Adventure art needed so far (6 Hunter facesets and 6 Monster facesets) from the official CC0 zip, with credits. It also sets up `node --test` for the hunt model.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Spaces take maps in order (Forest, Desert, Dungeon, Field, Ruins, Lakeside) and cycle past six; each map shows its Monster's face
- [ ] The space name falls back to Herdr's naming (repo, then folder, then `~`); a renamed space shows its custom name; path shows `~` for home, is shortened when long, and has no branch outside git
- [ ] Classes are assigned in order of first appearance across the workspace (Knight, Mage, Archer, Rogue, Monk, Samurai), cycle after six, and stay with a Hunter while it lives
- [ ] working/blocked/done/idle show as ⚔ Hunting / ! Needs help / ✓ Cleared / z Resting in the spec's colors; the Area dot shows the worst state (Needs help > Hunting > Cleared > Resting)
- [ ] A Hunter row shows its own branch only when it differs from its Area's branch
- [ ] An Area with no Hunters shows only its two lines
- [ ] Hunt model tests cover map cycling, Class order and cycling, state mapping, worst state, branch-only-when-different and path display, and pass with `node --test`
- [ ] Art comes from the official Ninja Adventure zip; a credits file names pixel-boy and AAA and CC0
- [ ] `herdr-app check` passes; a `herdr-app shot` matches the Area list in `docs/records/2026-11-05-preview.html`

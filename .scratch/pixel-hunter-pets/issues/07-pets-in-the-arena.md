# 07: Pets in the arena

**What to build:**

- The arena draws up to four Hunters. Each one gets its Pets as 16×16 animal sprites at 2×, by its feet: at most 2, then a small `[+N]`.
- Hunting Pets swap between their two frames. A Pet that Needs help shows a blinking `!`, once ticket 06 is done.
- Pets of Hunters the arena doesn't draw aren't drawn either.
- Nothing redraws while no Hunter or Pet is Hunting.
- RECIPE.md's **Watch out** section covers the Pet setup and the 2-minute limit.

**Blocked by:** 05

**From ticket 05:** the sprite sheets are in `art/animals/<Animal>/SpriteSheet.png` (32×16, two 16×16 frames), with no `art/x4/` copies yet (`tools/build-art.py` makes those).

**Status:** ready-for-agent

- [ ] Pet sprites sit beside their Hunter without covering the Monster, the HP bar or the caption
- [ ] `[+N]` appears when a drawn Hunter has more than 2 Pets
- [ ] Hunting Pets loop their two frames, and nothing redraws when no one is Hunting, checked the same way as in earlier tickets
- [ ] Screenshots of the demo snapshot and of a live session with Pets
- [ ] RECIPE.md is updated from the real files
- [ ] `herdr-app check` passes

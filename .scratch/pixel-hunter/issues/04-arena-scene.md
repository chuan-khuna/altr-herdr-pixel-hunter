# 04: Arena scene with Hunter animation

**What to build:** The top of the sidebar shows a top-down arena of the current Area's map. The background is 160×96 art px, shown at 2×. The Monster stands on the right playing its Idle strip, aligned by its feet. Up to four Hunters stand on the left facing it, picked by priority (Needs help, Hunting, Cleared, Resting), with `+N` for the rest. Each Hunter animates by state:

- Hunting swaps Idle and Attack with a 6 px lunge.
- Needs help shows the Item pose with a blinking `!`.
- Cleared hops once, then idles.
- Resting idles with a floating `z`.

A build script composes the six arena backgrounds from the pack's tiles, then desaturates and darkens them toward the canvas. The arena redraws nothing while no Hunter is Hunting or Needs help.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Switching spaces switches the arena map and Monster
- [ ] The arena shows at most four Hunters chosen by priority and `+N` for the rest (covered by a hunt model test)
- [ ] Each state animates as described, using one-shot timers and native loops only (no repeating timer)
- [ ] With every Hunter Resting or Cleared and nothing animating, the mod schedules no further redraws
- [ ] The arena background script is re-runnable and its output is pixel-exact; arenas look muted next to the sprites
- [ ] All sprites render with nearest-neighbour scaling (no blur)
- [ ] `herdr-app check` passes; a `herdr-app shot` matches the arena in the preview record

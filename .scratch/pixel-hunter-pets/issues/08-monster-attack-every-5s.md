# 08: Monster attacks every 5 seconds

**What to build:** Today, while someone in the Party is Hunting, the arena Monster plays its Hit strip non-stop (`hit` mode in `mods/pixel-hunter/arena.js`: 90 ms frames, shaking 2 px either way every 300 ms; the Giant Racoon plays its Attack strip because it has no Hit strip). That is too busy. While the Party Hunts, the Monster should play its Idle strip and play the Hit (Attack) strip once every 5 seconds, then go back to Idle.

- One Hit (Attack) play is the strip once through, there and back, as now: `2 × frames × 90 ms`. The 2 px shake runs only during that play.
- The Monster's feet stay on the same spot when it switches between Idle and Hit, using each strip's `feet`.
- Idle, Slain, the Hunter swap and the Needs help `!` do not change.
- Nothing redraws while no one is Hunting or Needing help, as now.
- Prefer native loops (`.loop` with the `after` / `before` square-wave trick) over a JS timer, so a 5 s cycle doesn't cost a render every frame.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] While Hunting, the Monster plays its Hit (Attack) strip once every 5 s and its Idle strip in between, for all six Monsters
- [ ] The shake only happens during the Hit play
- [ ] The Monster's feet don't jump when it swaps strips
- [ ] Nothing redraws when no one is Hunting, checked the same way as in earlier tickets
- [ ] A short screen recording or before/after screenshots of a live session with a Hunter Hunting
- [ ] RECIPE.md's **How it behaves** matches the new timing, updated from the real files
- [ ] `herdr-app check` passes

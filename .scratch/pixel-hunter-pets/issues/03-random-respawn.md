# 03: Random Respawn

**What to build:** An Area's first Monster is still its map's own. After a Monster is Slain, the next Respawn picks one of the other five Monsters at random. The current Monster is kept across restarts, like HP. The arena sprite, the arena caption (`Forest · Giant Frog`) and the Area row's face all show the current Monster.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `hunt()` accepts an injected `random` function (default `Math.random`), used only for Respawn picks
- [ ] Hunt model tests:
  - The first Monster is the map's own.
  - With an injected `random`, Respawn never repeats the Slain Monster and can pick any of the other five.
  - Persisted state without a Monster id still gives the map's own Monster.
- [ ] After a restart the respawned Monster is unchanged
- [ ] After a Respawn, a live or demo screenshot shows the same Monster in the arena sprite, the caption and the Area row face
- [ ] `node --test` and `herdr-app check` pass

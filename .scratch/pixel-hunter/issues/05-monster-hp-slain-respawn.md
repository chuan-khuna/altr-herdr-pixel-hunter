# 05: Monster HP, Slain and Respawn

**What to build:** The Monster reacts to its Party.

- While any Hunter in the Area is Hunting, the Monster plays its Hit strip with a small shake, and its HP wears down over time. HP is cosmetic.
- When no Hunter is Hunting and at least one is done, the Monster is Slain: HP drops to 0, and it falls and fades.
- When a Hunter starts Hunting after that, a fresh Monster Respawns with full HP.

HP shows as a bar in the arena and as a small bar in the Area row. HP and Slain state survive a Herdr restart.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] Hunt model tests (with injected time) cover HP wear, Slain only when nobody is Hunting and someone is done, a mixed Party (one Cleared, one Hunting) keeping the Monster alive, and Respawn on new Hunting
- [ ] The arena HP bar and the Area row HP bar agree
- [ ] Restarting Herdr keeps each Area's HP and Slain state
- [ ] A Slain Monster's Area row shows an empty HP bar
- [ ] `herdr-app check` passes

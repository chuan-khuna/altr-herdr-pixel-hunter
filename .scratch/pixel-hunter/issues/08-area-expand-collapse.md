# 08: Area expand and collapse

**What to build:** Area rows can collapse with ▸/▾. By default, the current Area and any Area with a Hunter that Needs help are expanded, and the rest are collapsed. A collapsed Area still shows its two lines, its dot and its HP. When the user expands or collapses an Area by hand, that choice is remembered per space across restarts and wins over the default, except that an Area with a Hunter that Needs help always opens.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Hunt model tests cover auto-expand for the current Area and Needs help, a manual collapse surviving a restart, and Needs help overriding a manual collapse
- [ ] Clicking the chevron toggles without selecting the space
- [ ] `herdr-app check` passes

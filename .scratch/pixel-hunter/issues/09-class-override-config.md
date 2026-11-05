# 09: Class override config

**What to build:** The user can pin a Class to a tab name in a small config file that lives with the mod (for example, tab `api` is always Mage). Pinned tabs keep their Class when tabs are closed or reordered. Unpinned Hunters still get Classes in order. An unknown Class name in the config is ignored and doesn't break the sidebar.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Hunt model tests cover an override, an override mixed with ordered assignment, and an invalid Class name
- [ ] Editing the config updates the sidebar without restarting Herdr
- [ ] The README documents the config
- [ ] `herdr-app check` passes

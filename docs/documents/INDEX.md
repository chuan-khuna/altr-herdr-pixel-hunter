# Documents

Implementation documents for developers. One bullet per document: `- [Title](file) — one-line summary`.

- [Pet tracking: Claude Code hooks](pet-tracking-hooks.md) — how Claude Code subagents reach the mod as Pets: `pets.mjs`, hook and `subagentStatusLine` settings, record format, hunt-model rules, and the hook behaviour verified in a real session (ticket 01).
- [Hunter row (layout F)](hunter-row.md) — how a Hunter row gets its tab name, program label and used/total tokens (statusLine record, `hunt()` fields) and how `areas.js` draws the strip, two lines and the Stamina bar; where the Pet line goes (ticket 05).

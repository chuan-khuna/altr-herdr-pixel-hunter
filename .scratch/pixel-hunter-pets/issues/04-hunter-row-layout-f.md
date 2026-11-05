# 04: Hunter row layout F

**What to build:** Hunter rows follow layout F from `docs/records/2026-11-05-hunter-row.html`:

- **Left edge:** a 4 px strip in the state colour.
- **Line 1:** the Herdr tab name as the Hunter's name. After it, in dim text: the Class, the program (only when it isn't Claude Code) and the branch (only when it differs from the Area's). The state icon sits on the right.
- **Line 2:** the Rank grade and model. On the right, used/total context tokens (`128k/200k`, `410k/1M`) beside the Stamina bar. The bar still shows what's left, in blue/cream/peach.

With no data the row shows `STA —` and no number. A Hunter that Needs help keeps its peach frame.

**Blocked by:** None (can start immediately). If ticket 01 lands first, use its finding for the token fields.

**Status:** ready-for-agent

- [ ] The statusLine script also records used and total context tokens when Claude Code reports them, and never computes them from percentages. Its black-box tests cover present and absent token fields.
- [ ] Each Hunter gains:
  - `name`: the tab name, falling back to the Class name
  - `programLabel`: null for Claude Code
  - `tokens`: `{ used, size, text }`, or null
- [ ] Hunt model tests:
  - the tab name, and the Class fallback
  - `programLabel` is null for Claude Code and the program name otherwise
  - token text for 200k and 1M windows, and null without data
  - an old record without tokens shows only the bar
- [ ] Rows render as layout F, and screenshots of the live window and the demo snapshot match the record
- [ ] Pane headers and tabs are unchanged
- [ ] `node --test` and `herdr-app check` pass

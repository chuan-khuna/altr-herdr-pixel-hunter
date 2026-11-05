# 06: Pet Needs help

**What to build:** When a subagent waits for the user's permission, its Pet shows Needs help:

- Its icon gets a 2 px peach frame.
- It sorts ahead of Hunting Pets, so `[+N]` never hides it.
- Its Area's dot turns peach and the Area expands automatically, the same as for a Hunter that Needs help.
- It goes back to Hunting once it runs a tool again, or at the next `subagentStatusLine` tick more than 2 s after it was marked (ticket 01: no tick arrives while a prompt is open, so a tick means the prompt closed; this covers a denied prompt, which fires no PostToolUse).
- It is never dropped as stale while it Needs help, because no heartbeat arrives during a prompt (ticket 01 saw 114 s without a tick).

Pane headers and tabs are unchanged, because the prompt already shows in the Hunter's terminal.

Ticket 01 confirmed that a subagent's `PermissionRequest` carries its `agent_id` and `agent_type`, so Pet Needs help is built as described.

**Blocked by:** 05

**From ticket 05:** `pets.mjs` ignores `help` and `unhelp` today, and `petsOf()` in `hunt.js` sets every Pet's `state` to `hunting` (its sort already goes by `PRIORITY`). The README's Pets block lists only `subagentStatusLine`, `SubagentStart` and `SubagentStop`: add the `PermissionRequest` and `PostToolUse` hooks there.

**Status:** done

- [x] Hook script black-box tests: `help` marks a Pet Needs help and sets `helpAt`, and `unhelp` marks it Hunting. Both do nothing without `agent_id` or for an unknown Pet. A `tasks` tick more than 2 s after `helpAt` marks it Hunting; one within 2 s leaves it in Needs help.
- [x] Hunt model tests: a Needs help Pet beyond the first two moves into the shown pair, and is not dropped when its `seenAt` is past `petStaleAfterSeconds`. A Needs help Pet raises the Area's worst state and makes it expand, even while its Hunter is Hunting or Resting.
- [x] The peach icon frame is visible in the demo snapshot, and in a real session with a subagent permission prompt
- [x] `node --test` and `herdr-app check` pass

## Comments

- Done in the live config, then `scripts/sync.sh`.
  - `pets.mjs`: `help` sets `state: "help"`, `helpAt` and `seenAt` on an existing record when the input has an `agent_id`; `unhelp` sets `"hunting"` and drops `helpAt`, writing only for a record in `help` (PostToolUse fires for every tool call). A `tasks` tick more than 2 s after `helpAt` (or a `help` record with no `helpAt`) puts it back to Hunting. Also: `start` treats a `help` sibling as live whatever its `seenAt`, so a long prompt doesn't free its animal or get it cleared as a leftover.
  - `hunt.js` `petsOf()`: `state` from the record (`"help"`, else `"hunting"`); a `help` Pet is never dropped as stale and has `staleAt: null` (`sidebar.js` `wakeAt()` skips it). The Area's `expanded`/`held` now count a Pet that Needs help. Tab dots and pane frames unchanged (Hunters only).
  - `areas.js` `petLine()`: Needs help icon has a `FRAME` (2 px) `blocked` peach border, face scaled to 14 px; tooltip prefixed `Needs help · `.
  - `demo.js`: cart's Frog Needs help (as in the Hunter row record) and a new Monkey under Login fix's Hunting Hunter Needs help, so that non-current Area is peach and open.
- Tests: 7 new (83 in all). `test/pets.test.js` 4 (black-box), `test/hunt.test.js` 3. `node --test` 83/83; `herdr-app check` passes; `herdr-app status` errors `[]`.
- Shots in `06-shots/` (sidebar crops at 2×, zooms at 4×; the full window showed my own session):
  - `demo-sidebar.png`, `demo-cart-zoom.png`: the demo snapshot (layout props got `"demo": true` for the shot, then the layout file was restored, checked with `cmp`). cart's Frog and Login fix's Monkey have the peach frame; Login fix's dot is peach and it is open.
  - `live-1-help-sidebar.png`, `live-1-help-zoom.png`: Claude Code 2.1.318 in a temporary space `ph06` (terminal `t2m`, `space.new` from the app, manual mode), with the README block plus the statusLine in a throwaway project's `.claude/settings.local.json`. A subagent's Bash prompt: the Racoon icon has the peach frame. The Hunter's row is Needs help too, because the prompt blocks its terminal.
  - Logged record states every 100 ms on a second subagent with two prompts: `help` at its first prompt, `hunting` on approval (PostToolUse), `help` again 2.4 s later, then after Esc (deny) `hunting` 8.3 s after `helpAt` (the tick fallback; no PostToolUse) and `SubagentStop` deleted it 0.8 s later.
  - `~/.claude/settings.json` was never edited: SHA-256 `7d12b7e4…c761` before and after.
  - Cleanup: closed the `ph06` space (its terminal ended), deleted `pets/t2m` and `sessions/t2m.json`, removed the throwaway project, and focused the pane I started on (`t9`). Claude Code keeps a folder-trust entry for the throwaway folder, and `ph06` is in the app's recent list.
- Docs: README Pets section (Needs help, the two new hooks), `RECIPE.md` from the files, `pet-tracking-hooks.md` ("Built in ticket 06" with the live findings), `hunter-row.md`, `INDEX.md`.
- Not verified:
  - A Pet's Needs help opening an Area *on its own* in a live session: a subagent's prompt also blocks its Hunter's terminal, so Herdr already shows the Hunter as Needs help. That case is covered by the hunt tests and the demo.
  - A real hover over a Needs help icon (tooltip) — no synthetic input.
  - Arena `!` for Pets is ticket 07.

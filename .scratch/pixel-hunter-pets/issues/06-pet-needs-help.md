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

**Status:** ready-for-agent

- [ ] Hook script black-box tests: `help` marks a Pet Needs help and sets `helpAt`, and `unhelp` marks it Hunting. Both do nothing without `agent_id` or for an unknown Pet. A `tasks` tick more than 2 s after `helpAt` marks it Hunting; one within 2 s leaves it in Needs help.
- [ ] Hunt model tests: a Needs help Pet beyond the first two moves into the shown pair, and is not dropped when its `seenAt` is past `petStaleAfterSeconds`. A Needs help Pet raises the Area's worst state and makes it expand, even while its Hunter is Hunting or Resting.
- [ ] The peach icon frame is visible in the demo snapshot, and in a real session with a subagent permission prompt
- [ ] `node --test` and `herdr-app check` pass

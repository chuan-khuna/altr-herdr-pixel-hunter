# 06: Pet Needs help

**What to build:** When a subagent waits for the user's permission, its Pet shows Needs help:

- Its icon gets a 2 px peach frame.
- It sorts ahead of Hunting Pets, so `[+N]` never hides it.
- Its Area's dot turns peach and the Area expands automatically, the same as for a Hunter that Needs help.
- It goes back to Hunting once it runs a tool again.

Pane headers and tabs are unchanged, because the prompt already shows in the Hunter's terminal.

If ticket 01 found that permission prompts don't say which subagent they come from, this ticket only adds a README note that Pet Needs help isn't available.

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] Hook script black-box tests: `help` marks a Pet Needs help and `unhelp` marks it Hunting. Both do nothing without `agent_id` or for an unknown Pet.
- [ ] Hunt model tests: a Needs help Pet beyond the first two moves into the shown pair. A Needs help Pet raises the Area's worst state and makes it expand, even while its Hunter is Hunting or Resting.
- [ ] The peach icon frame is visible in the demo snapshot, and in a real session with a subagent permission prompt
- [ ] `node --test` and `herdr-app check` pass

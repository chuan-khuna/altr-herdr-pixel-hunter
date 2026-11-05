# 05: Pets in the sidebar

**What to build:** Every Claude Code subagent shows up as a Pet, all the way from Claude Code to the screen.

- **Hook script.** A new script with the actions `start`, `stop` and `tasks` writes one record per Pet for its Herdr terminal. `start` picks an animal that none of that terminal's live Pets uses, with the first choice seeded from `agent_id`: ticket 01 found that a nested parent gets `SubagentStop` and then a second `SubagentStart` with the same `agent_id`, so this brings it back as the same animal when that animal is free. `tasks` matches rows to records by `tasks[].id`, which equals the hook `agent_id`, and uses `description` (not `label`).
- **Hunt model.** A folder watcher feeds the records to the model. The model attaches each Pet to its Hunter. Nested subagents count as Pets of the same Hunter.
- **Sidebar.** Under the Hunter row, a line of 18 px animal icons: at most 2, then `[+N]`. Hunting Pets come first, then the oldest. Hovering an icon shows the subagent type and task. Hovering `[+N]` lists the hidden Pets. Clicking an icon focuses the Hunter's terminal.
- **Hunt.** Hunting Pets keep HP wearing down and stop the Monster from being Slain.
- **Leaving.** A Pet leaves when its task ends, after 2 minutes without a report (`petStaleAfterSeconds`), or when its Hunter's terminal is gone.
- **Art.** The 10 small-animal assets come from the official Ninja Adventure zip, with credits.
- **README.** It explains the one-time setup and never edits the user's settings. The statusLine `refreshInterval` stays at 60 s: `subagentStatusLine` ticks every 5 s on its own (ticket 01).

See the spec and `docs/documents/pet-tracking-hooks.md`, as amended by ticket 01.

**Blocked by:** 01, 04

**Status:** ready-for-agent

- [ ] Hook script black-box tests:
  - `start` writes a record, and a second `start` for the same `agent_id` after `stop` picks the same animal when it is free.
  - `stop` deletes it, and a missing record is fine.
  - `tasks` fills in type and description, refreshes `seenAt`, deletes finished tasks and rewrites a record at most once every 30 s.
  - No two live Pets of a terminal share an animal until all 10 are in use.
  - Control and bidi characters are stripped.
  - Malformed stdin exits 0, writes nothing to stderr and changes nothing.
  - Nothing is written without a plain `HC_TERMINAL_ID`.
- [ ] Hunt model tests:
  - Only 2 Pets are shown, then `[+N]`, in the order above.
  - A Pet is dropped at exactly the stale limit, and at a custom limit.
  - Pets of closed or non-agent terminals are ignored.
  - A Pet whose app differs from the pane's is ignored.
  - A Hunting Pet keeps HP wearing down and prevents Slain while its Hunter is Cleared.
  - Pets never change Class assignment.
- [ ] The sidebar's single wake one-shot also arms for the earliest Pet stale time, with no new timer
- [ ] Animal art is copied pixel-exact with entries in the art credits; Cow, Horse and Lion are left out
- [ ] The demo snapshot has Pets, including `[+N]`
- [ ] Verified in a real Claude Code session in Herdr: Pets appear, update and disappear, and screenshots match layout F
- [ ] README has a Pets section with the settings block
- [ ] `node --test` and `herdr-app check` pass

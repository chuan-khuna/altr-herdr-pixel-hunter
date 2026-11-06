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

**Status:** done

- [x] Hook script black-box tests:
  - `start` writes a record, and a second `start` for the same `agent_id` after `stop` picks the same animal when it is free.
  - `stop` deletes it, and a missing record is fine.
  - `tasks` fills in type and description, refreshes `seenAt`, deletes finished tasks and rewrites a record at most once every 30 s.
  - No two live Pets of a terminal share an animal until all 10 are in use.
  - Control and bidi characters are stripped.
  - Malformed stdin exits 0, writes nothing to stderr and changes nothing.
  - Nothing is written without a plain `HC_TERMINAL_ID`.
- [x] Hunt model tests:
  - Only 2 Pets are shown, then `[+N]`, in the order above.
  - A Pet is dropped at exactly the stale limit, and at a custom limit.
  - Pets of closed or non-agent terminals are ignored.
  - A Pet whose app differs from the pane's is ignored.
  - A Hunting Pet keeps HP wearing down and prevents Slain while its Hunter is Cleared.
  - Pets never change Class assignment.
- [x] The sidebar's single wake one-shot also arms for the earliest Pet stale time, with no new timer
- [x] Animal art is copied pixel-exact with entries in the art credits; Cow, Horse and Lion are left out
- [x] The demo snapshot has Pets, including `[+N]`
- [x] Verified in a real Claude Code session in Herdr: Pets appear, update and disappear, and screenshots match layout F
- [x] README has a Pets section with the settings block
- [x] `node --test` and `herdr-app check` pass

## Comments

- Done in the live config, then `scripts/sync.sh`.
  - `pets.mjs` (new): actions `start`, `stop`, `tasks`; anything else (including ticket 06's `help`/`unhelp`) does nothing.
    - `start` writes `pets/<HC_TERMINAL_ID>/<agent_id>.json`. The animal is the first one, from a hash of `agent_id` on, that no sibling seen in the last 120 s has (any once all 10 are taken). A start while the record still exists keeps its animal, `startedAt` and description. It also clears records of another session not seen for 120 s (crash leftovers).
    - `tasks` matches `tasks[].id` to existing records only, takes `agentType` and `description` (not `label`), and rewrites when they change or `seenAt` is 30 s old (or in the future).
    - **Change from the doc:** the record gains `startAt` (its last start). A finished task deletes its record only when `startAt` is at least 10 s old. Seen live: a subagent that waits on a background shell gets `SubagentStop`, then a new `SubagentStart` (same id) when it wakes, and the next tick still says `completed`, which deleted the fresh record.
    - Ids must already be plain (`[A-Za-z0-9._-]`); nothing is stripped from them first.
  - `petwatch.js` (new): `watchFolder` on the pets folder into `self.pets`. Started by the sidebar, the tab bar and every pane header, because Pets change the Monster's persisted state and every copy must agree. `world()` writes no state until the Pets are read (like the pins).
  - `hunt.js`: `hunt({ pets })`, `petsOf()`, `ANIMALS`, `PETS_SHOWN`; `rankTable()` reads `petStaleAfterSeconds` (default 120, also added to `rank.json`). Each Hunter gets `pets: { shown, more, all }`. Pets join the Area's `worst` and the Monster's Party (Hunting, never done); tab dots, `arenaPick` and Classes ignore them. Every Pet is `hunting` until ticket 06.
  - `sidebar.js`: `wakeAt()` also takes the earliest Pet `staleAt`. No new timer.
  - `areas.js`: `petLine()` per layout F: 18 px icons (1 px frame, faceset scaled to 16 px), indented past the face, `[+N]`, tooltips, click → `agent.focus` (stops propagation).
  - `demo.js`: `demoPets()`: login has 5 Pets (Dog, Cat, `[+3]`), cart a Frog, docs a Dog2.
  - Art: the 10 animals' `Faceset.png` and `SpriteSheet.png` in `art/animals/<Animal>/`, `cmp`-identical to the official zip (downloaded again through itch's flow, same sha256 as in the credits). Cub is the pack's `LionCub`; Monkey Brown, Chicken White, Pig Pink, Fish Red. With the zip at hand I also checked the six Hit/Attack strips that came from the mirror: byte-identical, noted in `art/CREDITS.md`.
- Tests: 17 new (76 in all). `test/pets.test.js` (11, black-box) covers every hook-script checkbox plus the 10 s start grace and the leftover cleanup. `test/hunt.test.js` (6) covers the hunt-model checkboxes.
- Verified: `node --test` 76/76; `herdr-app check` passes; `herdr-app status` errors `[]`. Shots in `05-shots/`, sidebar crops at 2×:
  - `demo-sidebar.png`: the demo snapshot. The layout's sidebar props got `"demo": true` for the shot, then the file was restored and checked byte for byte with `cmp`. It matches layout F's Pet lines (`04-shots/record-F.png`): login Dog + Cat `[+3]`, cart Frog, docs Dog2. The difference is that cart's Frog has no peach frame (ticket 06).
  - Live: Claude Code 2.1.318 in a temporary space `ph05` (terminal `t2k`, via `space.new`; the app's environment had no `CLAUDE*` variables, and it started in manual mode). The project's `.claude/settings.local.json` held the README's block with the `~` paths, plus the statusLine. `~/.claude/settings.json` was never edited: same SHA-256 before and after (`7d12b7e4…c761`).
    - `live-1-appear-sidebar.png` / `live-1-appear-full.png`: four subagents started. Two icons and `[+2]`, the Area dot blue.
    - `live-2-update-sidebar.png`: the Explore one finished, so `[+1]`. `seenAt` moved after 30 s.
    - `live-3-gone-sidebar.png`: all done. No Pet line, Cleared, Slain.
    - `live-stale-drop.png`: a hand-written record with `seenAt` 110 s old shows a Pig at +112 s and is gone at +123 s. HP was wearing too, so the 10 s HP wake was also armed; the shot shows the drop happens without any record change, not which wake fired.
    - `live-0-background-wait-sidebar.png`: a first round where `sleep N` subagents backgrounded their sleeps and ended their turns. Claude Code stopped them and its ticks called them `completed`, so they had no Pets and the Monster was Slain while the shells still ran. That is Claude Code's model (the same as ticket 01's nested parent); the tick status can't tell waiting from done. Documented in `pet-tracking-hooks.md` ("Verified behaviour (ticket 05)"), `RECIPE.md` **Watch out** and the README.
  - Cleanup: killed `t2k` (its space closed with it) and deleted its pets folder and session record. The layout file was restored. I focused the space, tab and pane I started on (`t9`). Claude Code keeps a folder-trust entry for the throwaway project, as in ticket 01.
- Docs: `README.md` Pets section with the settings block (and `petStaleAfterSeconds` in the grade-table block), `RECIPE.md` from the files, `pet-tracking-hooks.md` (status, `startAt`, art paths, "Built in ticket 05" with findings), `hunter-row.md`, `INDEX.md`. I added "From ticket 05" notes to tickets 06 and 07.
- Not verified:
  - A real hover over the icons and `[+N]` (tooltips) and a real click on an icon: no synthetic input.
  - Nested subagents shown live as Pets of the same Hunter: the nested run happened in the background-sleep round, so its Pets were only briefly on screen between stops. The model flattens by terminal, so a nested Pet is the same as any other.
  - `pixel-hunter/preview.png` still shows the old rows.

# Spec: Pets, Hunter row F, Area rows and random Respawn

**Status:** ready-for-agent

Vocabulary follows `GLOSSARY.md` (Area, Monster, HP, Respawn, Hunter, Class, Party, Pet, Stamina, Rank, Hunting, Needs help, Cleared, Slain, Resting). This spec amends `.scratch/pixel-hunter/spec.md` where they disagree: stories 3, 6, 8, 15, 22, 28, 29 and 39 there.

Visual references:
- `docs/records/2026-11-05-hunter-row.html`, layout **F**: the chosen Hunter row with Pet icons.
- `docs/records/2026-11-05-preview.html`: the revised three-line Area rows.

Implementation reference: `docs/documents/pet-tracking-hooks.md` covers the hook script, records, settings and model rules. Discussion record: `docs/records/2026-11-05-pets.md`.

## Problem Statement

My Claude Code agents start subagents all the time, often several at once and often in the background. The pixel-hunter layout can't see any of them. A Hunter can look Cleared or Resting while its subagents are still working. The Monster can fall while work is still going on. A subagent waiting for my permission is invisible until I happen to look at the right terminal.

The sidebar also repeats itself and hides useful things. The Area row repeats the map name and HP the arena already shows. A Hunter row is named after its Class, which tells me nothing about the work. The row doesn't say which program runs when it isn't Claude Code. It doesn't show how many tokens of context are used. Every Area also fights the same Monster forever, so finishing a hunt never feels like it leads anywhere new.

## Solution

Every Claude Code subagent becomes a **Pet** of the Hunter that started it: a small animal that follows the Hunter. Pets appear as a line of animal icons under their Hunter's row and as small sprites at the Hunter's feet in the arena. Each place shows at most 2, then `[+N]`. Pets are Party members. A working Pet keeps the Monster alive and its HP wearing down. A Pet waiting for permission is as loud as a Hunter that Needs help. A Pet disappears when its task ends. Pets come from an optional one-time Claude Code hook setup. Without it, nothing is shown and nothing is guessed.

The Hunter row is redrawn as layout F:
- a state-colour strip on the left
- the tab name as the Hunter's name, with the Class (and the program, when it isn't Claude Code) dim after it
- the Rank and the model
- used/total tokens (`128k/200k`) beside the Stamina bar

The Area row becomes three lines (space name, path, branch) beside the Monster's face, without the map name or HP bar. After a Monster is Slain, the next Respawn brings a random different Monster to that Area.

## User Stories

### What a Pet is
1. As a Claude Code user, I want each subagent my agent starts to appear as a Pet of that agent's Hunter, so that I can see delegated work.
2. As a user, I want subagents started by subagents (nested at any depth) to count as Pets of the same Hunter, so that no work is hidden and nothing is drawn from guessed relationships.
3. As a user, I want Pets to be members of their Hunter's Party, so that the hunt reflects all the work in the Area.
4. As a user, I want Pets to have no Class and no Rank, and to never change which Class a Hunter gets, so that Hunters keep their looks when subagents come and go.
5. As a user of another agent (Codex, Gemini, …), I want no Pets shown for it, so that the layout never invents subagents it can't see.

### Pet looks
6. As a user, I want each Pet to look like a small animal, so that it reads as a companion and not as another Hunter.
7. As a user, I want a Pet's animal picked at random when the Pet appears, so that Pets feel alive and varied.
8. As a user, I want a Pet to keep its animal until it ends, including across redraws and Herdr restarts, so that I can follow one Pet.
9. As a user, I want a Hunter's live Pets to have different animals until all 10 small animals (Cat, Dog, Dog2, Cub, Frog, Racoon, Monkey, Chicken, Pig, Fish) are in use, so that two shown Pets never look identical.

### Pet states
10. As a user, I want a working Pet shown as Hunting, so that I know delegated work is going on.
11. As a user, I want a Pet that waits for my permission shown as Needs help, so that I find it at once.
12. As a user, I want a Pet to disappear as soon as its task completes, fails or is killed, so that the sidebar only shows work in progress.
13. As a user, I want a Pet to never be Resting or Cleared, so that Pet states stay simple.

### Pets in the sidebar
14. As a user, I want a line of Pet icons under the Hunter's row, so that I see each Hunter's Pets without the row growing much.
15. As a user, I want at most 2 Pet icons per Hunter, then `[+N]` for the rest, so that a Hunter with many Pets stays compact.
16. As a user, I want the shown Pets picked Needs help first, then Hunting, then oldest first, so that a Pet that needs me is never hidden behind `[+N]`.
17. As a user, I want a Pet that Needs help to have a peach frame on its icon, so that it stands out like a Hunter that Needs help.
18. As a user, I want to hover a Pet icon and see its subagent type and the task its Hunter gave it, so that I know what it is doing.
19. As a user, I want to hover `[+N]` and see the hidden Pets listed, so that I can check them without expanding anything.
20. As a user, I want clicking a Pet icon to focus its Hunter's terminal, so that I land where the Pet's permission prompt shows.
21. As a user, I want no Pet line under a Hunter without Pets, so that quiet Hunters take no extra space.

### Pets in the arena
22. As a user, I want each shown Hunter's Pets drawn as small animal sprites (2×) at the Hunter's feet, so that the arena shows the helpers too.
23. As a user, I want at most 2 Pet sprites per Hunter in the arena, then a small `[+N]`, so that the scene stays readable.
24. As a user, I want Hunting Pets to swap between their two frames, so that I can see them working.
25. As a user, I want a Pet that Needs help to show a blinking `!` above it, so that the arena signal matches the Hunter's.
26. As a user, I want no Pets drawn for Hunters that aren't among the four the arena shows, so that the arena doesn't overflow.

### Pets and the hunt
27. As a user, I want the Monster's HP to keep wearing down while any Pet is Hunting, so that HP reflects all the work.
28. As a user, I want the Monster to stay alive while any Hunter or Pet is Hunting, so that it never falls while a background subagent is still working.
29. As a user, I want a Pet that Needs help to make its Area's dot peach and expand the Area automatically, so that nothing that needs me is hidden.
30. As a user, I want a Pet that Needs help to make no change to pane headers or tabs, so that they stay uncluttered. Its prompt already shows in the Hunter's own terminal.

### Pet reliability
31. As a user, I want a Pet to disappear when it hasn't reported for 2 minutes, so that a crashed Claude Code session doesn't leave Pets stuck and keep the Monster alive forever.
32. As a user, I want that limit editable in the same config as the Stamina freshness limit, so that I can tune it.
33. As a user, I want a Pet dropped when its Hunter's terminal closes or stops being an agent, so that orphan Pets never show.
34. As a user, I want Pets to keep updating while my Hunter is idle and waiting on background subagents, so that their states stay current.

### Pet setup
35. As a Claude Code user, I want a one-time setup (hooks and a subagent status line) explained in the README, so that I can turn Pets on myself.
36. As a user, I want the setup to never edit my Claude Code settings for me, so that I stay in control of my config.
37. As a user, I want to see no Pets at all without the setup, so that the layout never shows guessed data.
38. As a user, I want the hook script to never block, slow down or break Claude Code, even on bad input, so that turning Pets on is safe.
39. As a user, I want subagent descriptions cleaned of control and bidi characters and capped in length, so that a strange task text can't break the sidebar.
40. As a user, I want the hook script to do nothing outside a Herdr terminal, so that my other Claude Code sessions are unaffected.

### Hunter row (layout F)
41. As a user, I want a 4 px strip in the Hunter's state colour on the left edge of its row, so that states read at a squint.
42. As a user, I want the Hunter's Herdr tab name as its name, so that I see what each Hunter works on.
43. As a user, I want the Class name dim after the tab name, so that I can still match the face to its Class.
44. As a user, I want the program name (e.g. `Codex`) after the Class only when it isn't Claude Code, so that the common case has no noise.
45. As a user, I want the Hunter's branch after that only when it differs from its Area's branch, as before, so that worktrees stay visible.
46. As a user, I want the state shown as its icon at the right of line 1, with the strip carrying the colour, so that the row stays short.
47. As a user, I want line 2 to show the Rank grade and model, as before, so that I see which model runs where.
48. As a user, I want used/total context tokens (e.g. `128k/200k`, `410k/1M`) beside the Stamina bar, so that the number matches what Claude Code shows.
49. As a user, I want the Stamina bar to keep showing what's left and its blue/cream/peach colours, so that low context still warns me.
50. As a user, I want `STA —` and no token number when there is no data, so that nothing is estimated.
51. As a user, I want a Hunter that Needs help to keep its peach frame around the row, so that it stays the first thing I see.

### Area row
52. As a user, I want each Area row to show three lines beside the 76 px Monster face (space name with the worst-state dot and `⌃N`, then the path, then the branch), so that each piece of information has its own line.
53. As a user, I want no map name and no HP bar in Area rows, so that the sidebar doesn't repeat what the arena shows.
54. As a user, I want the branch line empty outside git, so that the row stays honest.
55. As a user, I want the path line to never show `undefined`, so that a missing path never shows as garbage.

### Random Respawn
56. As a user, I want an Area's first Monster to be its map's own Monster, so that each map starts with a familiar face.
57. As a user, I want each Respawn after a Slain Monster to bring a Monster picked at random from all Monsters except the one just Slain, so that each new hunt feels new.
58. As a user, I want the respawned Monster kept across restarts like HP, so that restarting Herdr doesn't swap it.
59. As a user, I want the arena caption, the Area row's face and the arena sprite to all follow the current Monster, so that they always agree.

## Implementation Decisions

- **Hook script.** A new plain-Node script, `pets`, lives in the pixel-hunter mod next to the statusLine script, with no Herdr imports. Its first argument picks an action:
  - `start` (SubagentStart): creates a Pet record and picks its animal.
  - `stop` (SubagentStop): deletes the Pet record.
  - `help` (PermissionRequest that carries an `agent_id`): marks the Pet Needs help.
  - `unhelp` (PostToolUse that carries an `agent_id`): marks the Pet Hunting again.
  - `tasks` (the `subagentStatusLine` command): fills in type and description, refreshes the heartbeat, and drops completed, failed or killed tasks. Because no tick arrives while a permission prompt is open, a tick more than 2 s after a Pet's `helpAt` also marks it Hunting again (covers a denied prompt, which fires no PostToolUse).

  It reads the hook JSON from stdin, always exits 0, and prints nothing.
- **Shared rules with the statusLine script.** Identity comes from `HC_TERMINAL_ID` and nothing is written without a plain id. Control and bidi characters are stripped and text is capped at 80 characters. Writes go to a temp file and then rename, with an in-place fallback on Windows. There is an env override for the folder.
- **Records.** One JSON file per Pet, under the Herdr app data folder: `pixel-hunter/pets/<terminal>/<agent id>`. Separate files mean Pets starting in parallel never race. Shape: `{ v, app, terminal, session, agent, type, description, animal, state: "hunting" | "help", helpAt, startedAt, seenAt }`. `tasks` rewrites a record only when it changes, or when `seenAt` is 30 s old.
- **Animal pick.** It happens in the script at `start`. The script reads its sibling records and picks among animals not used by this terminal's live Pets, with the first choice seeded from the `agent_id`, so a resumed subagent (same `agent_id`) usually gets its animal back. When all 10 are used, it picks from all 10.
- **Pet adapter.** A Herdr-side reader, like the existing sessions reader, watches the pets folder with `watchFolder` and passes `{ [terminal]: record[] }` to the world. It uses no new timer, except that the sidebar's existing single wake one-shot also arms for the earliest Pet stale time.
- **Hunt model input.**
  - `hunt()` gains `pets` and a `random` function (defaults to `Math.random`), used only for Respawn picks.
  - The config gains `petStaleAfterSeconds` (default 120), next to `staleAfterSeconds`.
- **Hunt model output.**
  - Each Hunter gains `pets: { shown: Pet[≤2], more: number, all: Pet[] }`, ordered Needs help, then Hunting, then `startedAt`. Each Pet carries `{ agent, type, description, animal, state }`.
  - Each Hunter gains `name` (the tab name, falling back to the Class name), `programLabel` (null for Claude Code), and `tokens: { used, size, text }`, where `text` is like `128k/200k` or `410k/1M`, and null without data.
  - Each Area gains `monster` (the current Monster id).
- **Pet filtering.** Pets are dropped when the owning terminal isn't a live agent pane, when `seenAt` is older than the limit (never while the Pet Needs help: no heartbeat arrives during a prompt), or when the record's `app` differs from the pane's app.
- **Party rules.** Pet states join the Area's worst state, the Needs help auto-expand, HP wear (any member Hunting) and Slain (no member Hunting and at least one Hunter done). `arenaPick` stays Hunter-only. Pets ride along with their Hunter.
- **Token data.** It comes from the statusLine script. The session record gains `used` and `size` (context tokens) when Claude Code reports them, and is never computed from percentages. The record version bumps if needed. Older records without tokens show the bar only.
- **Respawn.**
  - The model keeps `monsters[area].id` in persisted state.
  - The first Monster is `mapFor(index)`'s own.
  - On Respawn the next id is `random`-picked from all six bosses minus the Slain one.
  - Old state without an id means the map's own Monster.
- **Hunter row rendering (layout F).**
  - Grid: state strip, 38 px face, two text lines, and an optional Pet icon line.
  - Line 1: name, then dim Class, program and branch, then the state icon on the right.
  - Line 2: grade tag and model, then tokens and the 44 px Stamina bar on the right.
  - Pet icons are 18 px animal facesets. A Needs help icon gets a 2 px peach frame.
- **Arena.**
  - Pet sprites are 16×16 at 2× beside each drawn Hunter, with two-frame Hunting and a blinking `!` for Needs help.
  - Animation stays inside the existing redraw budget: no redraw when nothing is Hunting.
- **Area row rendering.** A 76 px face spans three lines: name with dot and `⌃N`, path, and branch (`⎇ name`, or empty). The map name and HP bar are removed from the row, while the arena keeps them. A missing path falls back to the Area's folder or home, never `undefined`.
- **Art.**
  - The 10 small-animal facesets and sprite sheets get copied pixel-exact from the official Ninja Adventure zip (CC0) and added to the art credits.
  - Cow, Horse and Lion are excluded.
- **Setup docs.** The README gets a Pets section with the settings block (hooks plus `subagentStatusLine`; the statusLine `refreshInterval` stays at 60 s, since `subagentStatusLine` ticks every 5 s on its own). RECIPE.md **Watch out** notes the setup and the 2-minute limit.

## Testing Decisions

- Good tests check external behaviour only: `hunt()` inputs → its output, and the hook script's stdin and env → files on disk. They don't check internal helpers or rendering code.
- **Seam 1: `hunt()`** (prior art: the existing hunt model tests). New cases:
  - The 2 + `[+N]` cut and ordering, including a Needs help Pet beyond the first two moving up.
  - Stale Pets dropped at exactly the limit and with a custom limit, and a Needs help Pet never dropped as stale.
  - Pets of a closed or non-agent terminal ignored.
  - A Pet with another app ignored.
  - A Hunting Pet keeps HP wearing and prevents Slain while its Hunter is Cleared.
  - A Pet that Needs help raises the Area's worst state and auto-expand.
  - Pets never change Class assignment.
  - The tab name, with the Class fallback.
  - `programLabel` is null for Claude Code and the name otherwise.
  - Token text for 200k and 1M windows, and null without data.
  - The first Monster is the map's own, Respawn with an injected `random` never repeats the Slain Monster, and old state without an id still works.
  - The Area path never contains `undefined`.
- **Seam 2: the hook script, black-box** (prior art: the existing statusLine script tests that spawn the script with env and stdin). New cases:
  - `start` writes a record.
  - `stop` deletes it, and a missing record is fine.
  - `help` and `unhelp` toggle state, and are ignored without `agent_id`.
  - `tasks` fills in type and description, refreshes `seenAt` and deletes finished tasks.
  - The animal pick never duplicates among live siblings until all 10 are used.
  - Control and bidi characters are stripped.
  - Malformed stdin exits 0 with no stderr and no record change.
  - Nothing is written without `HC_TERMINAL_ID` or with a path-like id.
  - The 30 s rewrite throttle.
- **Rendering.** The sidebar, arena and Area rows are verified with screenshots of the live window and the demo snapshot against the records, as earlier tickets did. The demo data gains Pets (including Needs help and `[+N]`) and a respawned Monster.
- `herdr-app check` passes, and `node --test` passes in the mod.

## Out of Scope

- Herdr sub-agents started with `hc run` (terminals with a `parent`). This is a different kind of sub-agent, not shown as Pets.
- Subagents of agents other than Claude Code.
- A tree view of nested subagents.
- Opening or peeking at a Pet's own transcript. Clicking only focuses the Hunter.
- Pets in pane headers or tab pills.
- Pet Rank, model or context bars.
- Editing the user's Claude Code settings automatically.
- A light theme for the docs stylesheet.

## Further Notes

- Ticket 01 checked the Claude Code facts in a real session (Claude Code 2.1.318 in a Herdr terminal). Payloads and details are in `docs/documents/pet-tracking-hooks.md`, "Verified behaviour (ticket 01)". In short:
  - **`tasks[].id` and `agent_id`.** Equal, and `tasks[].agentType` equals `agent_type`. Match on the id.
  - **`PermissionRequest` and `agent_id`.** A subagent's prompt carries `agent_id` and `agent_type`; the Hunter's own has neither. Stories 11, 17 and 25 stay.
  - **Background and nested subagents.** `SubagentStop` fires for both. A nested parent stops while it waits for its child and starts again with the same `agent_id`, so its Pet leaves and comes back (with the same animal when it is free).
  - **Environment.** `HC_TERMINAL_ID` reaches every hook and both status-line commands.
  - **Settings shape.** `"subagentStatusLine": { "type": "command", "command": "…" }`. It ticks every 5 s while the agent panel shows a row, also while the Hunter is idle, independent of the statusLine `refreshInterval`.
  - **Fallback that applies.** Neither status-line command ticks while a permission prompt is open, however long. A Needs help Pet is therefore never dropped as stale, and the next tick after the prompt closes clears Needs help.
  - **Tokens (ticket 04).** The statusLine input has `context_window.total_input_tokens` (used) and `context_window.context_window_size` (total).
- Ticket 06 set the statusLine `refreshInterval` to 60 s. That stays: Pets don't depend on it.
- The sprite sheets for most animals have only two 16×16 frames, so Pet animation is a two-frame loop with no attack pose.

# Spec: pixel-hunter layout

**Status:** ready-for-agent

**Amended by:** `.scratch/pixel-hunter-pets/spec.md` (Pets, Hunter row layout F, three-line Area rows, random Respawn). Stories 3, 6, 8, 15, 22, 28, 29 and 39 below are superseded where they disagree.

Vocabulary follows `GLOSSARY.md` (Area, Monster, HP, Respawn, Hunter, Class, Party, Stamina, Rank, Hunting, Needs help, Cleared, Slain, Resting). Visual references: `docs/records/2026-11-05-color-theme.html` (palette and color principles) and `docs/records/2026-11-05-preview.html` (full window mock with real sprites).

## Problem Statement

When I run several coding agents across several Herdr spaces, the default window gives me plain lists and terminals. I can't see at a glance which agent is waiting on me, which one finished, and how much context each has left, especially in spaces I'm not looking at. It's also not fun to look at for hours. I want a Herdr layout that turns my agents into a party of pixel-art hunters fighting monsters, so that status is obvious and the workspace has some character. I also want to share it on herdr.dev/layouts.

## Solution

A Herdr layout named **pixel-hunter**: a monster-hunting, 8-bit pixel RPG skin with only original characters (no Monster Hunter names, monsters or UI). Each space becomes an **Area** (a hunting map with its own **Monster**). Each agent becomes a **Hunter** with a **Class**, a **Rank** (its model) and **Stamina** (its remaining context). The sidebar shows a top-down battle arena for the current Area, then every Area with its Party listed underneath. Tabs and pane headers carry Hunter faces. Needs help is the most visible signal anywhere on screen. The look is a faded blue-cyan dark theme with Pixelify Sans and CC0 sprites from the Ninja Adventure pack.

## User Stories

### Areas
1. As a Herdr user, I want each space shown as an Area with a hunting map, so that spaces are easy to tell apart.
2. As a user, I want spaces to take maps in order (Forest, Desert, Dungeon, Field, Ruins, Lakeside) and cycle once all six are used, so that nearby spaces look different.
3. As a user, I want each map to have its own Monster (Forest: Giant Racoon, Desert: Demon Cyclops, Dungeon: Giant Spirit, Field: Blue Tengu, Ruins: Red Warlord, Lakeside: Giant Frog), so that the map and its Monster feel like one place.
4. As a user, I want an Area with no Hunters to still show its Monster, so that every space looks alive.
5. As a user, I want an Area's first line to show the Herdr space name (the repo name unless I renamed it), so that I recognise my projects.
6. As a user, I want an Area's second line to show the path of its first terminal and its git branch, so that I always see the real repo even after renaming a space.
7. As a user, I want home shown as `~`, long paths shortened, and no branch shown outside git, so that the line stays short and honest.
8. As a user, I want each Area row to show the Monster's face (76 px, twice a Hunter face, on the left spanning both lines), a small HP bar, the worst state among its Hunters as a dot, and its `⌃N` shortcut, so that I can scan all Areas without expanding them.
9. As a user, I want to click an Area to select its space, right-click for its menu, and drag to reorder, so that it behaves like Herdr's own space list.
10. As a user, I want the current Area and any Area with a Hunter that Needs help to be expanded automatically, so that nothing that needs me is hidden.
11. As a user, I want to collapse or expand an Area myself and have that remembered per space across restarts, so that my sidebar stays the way I left it.

### Hunters
12. As a user, I want each agent shown as a Hunter under its Area, so that I see every agent in every space at once.
13. As a user, I want Hunters to get Classes (Knight, Mage, Archer, Rogue, Monk, Samurai) in order of appearance across the whole workspace, cycling after six, so that Hunters look as different as possible.
14. As a user, I want to pin a Class to a tab name in a config file, so that a Hunter keeps its look when tabs are closed or reordered.
15. As a user, I want each Hunter row to show its face, Class, state label with icon (⚔ Hunting, ! Needs help, ✓ Cleared, z Resting), Rank and Stamina bar, so that I understand each agent at a glance.
16. As a user, I want a Hunter row to show its own branch only when it differs from its Area's branch, so that worktrees are visible without clutter.
17. As a user, I want a Hunter that Needs help to have a peach frame around its row, so that it's the first thing I see.
18. As a user, I want to click a Hunter row to focus that agent, so that I can jump straight to it.

### Rank and Stamina
19. As a Claude Code user, I want each Hunter's Rank to show its model with a letter grade, like `[A] Opus 5.5` (Fable S, Opus A, Sonnet B, Haiku C), so that I see which model runs where.
20. As a user, I want an unknown model or program to show grade `?` with the program name, so that non-Claude agents still show something sensible.
21. As a user, I want the grade mapping in an editable table, so that new model names can be graded without code changes.
22. As a Claude Code user, I want Stamina to show the context window left as a bar, so that I know when an agent is close to compacting.
23. As a user, I want Stamina blue at 50% and up, cream from 20% to 50%, and peach below 20%, without blinking, so that low context warns me without competing with Needs help.
24. As a user, I want Stamina to show `—` when there is no data, and never an estimated value, so that I can trust the numbers.
25. As a user, I want an optional Claude Code statusLine script that records context and model per terminal, so that Rank and Stamina work after a one-time setup.
26. As a user, I want data marked stale when it's older than a freshness limit, so that I don't act on old numbers.

### Arena
27. As a user, I want the top of the sidebar to show a top-down arena of the current Area's map, so that the current hunt feels like a game scene.
28. As a user, I want the Monster on the right and up to four Hunters on the left facing it, so that the scene reads as a fight.
29. As a user, I want the four Hunters in the arena chosen by priority (Needs help, then Hunting, then Cleared, then Resting) with `+N` for the rest, so that the ones that need me are always in view.
30. As a user, I want Hunting Hunters to swap between Idle and Attack poses with a small lunge, so that I can see work happening.
31. As a user, I want a Hunter that Needs help to raise a hand with a blinking `!`, so that it's unmistakable.
32. As a user, I want a Cleared Hunter to hop once and then idle, so that finishing feels rewarding.
33. As a user, I want a Resting Hunter to idle with a floating `z`, so that I know it's idle.
34. As a user, I want the arena backgrounds muted and darkened toward the theme, so that the sprites stand out.

### Monster HP, Slain and Respawn
35. As a user, I want the Monster's HP to wear down while its Party is Hunting, so that progress feels visible. (HP is cosmetic.)
36. As a user, I want the Monster to play its Hit animation and shake while the Party is Hunting, so that the arena reacts to work.
37. As a user, I want the Monster to be Slain only when no Hunter in its Party is Hunting and at least one is done, so that it doesn't fall while a teammate is still fighting.
38. As a user, I want a Slain Monster to fall and fade, so that a cleared Area is obvious.
39. As a user, I want a fresh Monster with full HP to Respawn when a Hunter starts Hunting again, so that each new task is a new hunt.
40. As a user, I want HP and Slain state kept across restarts, so that the arena doesn't reset when Herdr restarts.

### Tabs and panes
41. As a user, I want each tab to show the face of its first Hunter, its name and a state dot, with a map icon when it has no agent, so that I can find agents from the tab bar.
42. As a user, I want Files and Changes buttons on the right of the tab bar that open Herdr's shipped panels, so that I keep those tools.
43. As a user, I want each pane header to show the Hunter's face, Class, Rank, folder and branch, and its state, so that every terminal tells me who is in it.
44. As a user, I want the focused pane framed in mint and a Needs help pane framed in peach (peach wins), so that focus and urgency never get confused.
45. As a user, I want terminals on the plain dark canvas with no image behind the text, so that output stays readable.

### Look and feel
46. As a user, I want the dark theme `pixel-hunter-night` (faded blue-cyan, sage-cream text about 9:1, warm colors only for Needs help and HP), so that it's comfortable for long sessions.
47. As a user, I want 2 px square pixel frames and no rounded corners, so that it looks 8-bit.
48. As a user, I want Pixelify Sans across the UI and Press Start 2P only for the logo, so that text stays readable.
49. As a user, I want animations to stop redrawing when nothing is Hunting, so that the layout costs no CPU when idle.

### Sharing
50. As a layout author, I want the layout, its mods, theme, fonts and art in the shared folder with a RECIPE.md and preview.png, so that it can be listed on herdr.dev/layouts and rebuilt by another agent.
51. As a layout author, I want sprite credits and the CC0 license noted, so that anyone can reuse the art safely.
52. As a layout author, I want the name and all characters to be original, so that the layout carries no trademark risk.

## Implementation Decisions

- **Name**: the layout, theme, mods and shared folder are renamed from `monster-hunter` to `pixel-hunter`. The repo's sync script and AGENTS.md follow.
- **Mods** (all prefixed `pixel-hunter`; shipped mods are referenced, never copied):
  - a **hunt model** module: pure logic with no Herdr imports, shared by every view;
  - a **sidebar** mod: logo row, arena, Area list with Hunters;
  - a **tabs** mod: the tab bar with Hunter faces, plus Files/Changes buttons using the shipped `files` and `changes` mods;
  - a **pane header** mod, one copy per pane.
  A mod can't import from outside its own folder (traveler's lesson), so either everything lives in one mod with several roles chosen by props (kaiju's pattern) or the model is copied. Prefer **one mod with roles** so the model exists once.
- **Hunt model interface**: one function from a snapshot to a view model.
  - Input: spaces (id, name, named, order), panes (space, tab, agent status working/blocked/done/idle, program, cwd, branch, focused), session records per terminal (context left, model name, timestamp), the Class override config, the grade table, and persisted state (per-Area HP, Slain, collapsed flags, Class assignments).
  - Output: Areas in order, each with map, Monster, HP, mode (idle/hit/slain), worst state, expanded flag, display name, path and branch. Each Area holds its Hunters with Class, hunt state, Rank (grade and label), Stamina (percent or none, level, stale), branch only when it differs, and arena order with the overflow count. It also returns the next persisted state.
  - Time is passed in, never read inside the model, so HP wear and staleness are deterministic.
- **State mapping**: working → Hunting, blocked → Needs help, done → Cleared, idle → Resting. Priority for the worst state and arena order: Needs help > Hunting > Cleared > Resting.
- **Map assignment**: by space order, cycling through the six maps. Map → Monster is a list per map (one entry for now), so more Monsters per map can be added later without a schema change.
- **Class assignment**: by order of first appearance across the whole workspace, cycling through six Classes; a config keyed by tab name overrides it. Assignments persist so a Hunter keeps its Class while it lives.
- **Slain rule**: Slain when no Hunter in the Party is Hunting and at least one is done. Respawn with full HP when any Hunter starts Hunting after Slain.
- **Data sources**: folder and branch come from Herdr's pane data (no git process is run). Rank and Stamina come from session files written by an optional Claude Code statusLine script, keyed by terminal id. The script strips control characters from anything it writes. Missing data shows `—`, never an estimate.
- **Grade table**: Fable → S, Opus → A, Sonnet → B, Haiku → C, anything else → `?`. Editable without code changes.
- **Persistence**: collapsed flags, HP/Slain and Class assignments live in the mod's shared state.
- **Art**: Ninja Adventure (CC0) taken from the official zip, 16×16 Hunters shown at 2× in the arena and 3× elsewhere, 38 px facesets (Hunter faces at 38 px, the Monster face in an Area row at 76 px, scaled up nearest-neighbour), Monster Idle/Hit strips. Hunter sheets: Classes Knight (Knight), Mage (SorcererBlack), Archer (Hunter), Rogue (NinjaMasked), Monk (Monk), Samurai (Samurai). Arena backgrounds are composed from the pack's tiles at 160×96 art px by a build script, desaturated and darkened toward the canvas. All images are exported pixel-exact and shown with nearest-neighbour scaling.
- **Animation**: one-shot timers and native loops only, no repeating timers, and no redraw while nothing is Hunting (kaiju's lesson). Hunter animation is frame swaps plus small offsets, because the pack has one frame per direction for Attack, Jump and Item.
- **Layout tree**: a row with a 320 px fixed sidebar column and a work column (44 px tab bar, then panes with an 8 px gap and a hidden 360 px side panel for Files/Changes). Pane frames are 2 px, radius 0. Pane headers are 28–30 px.
- **Theme `pixel-hunter-night`**: canvas `#101a24`, chrome `#15222e`, surface `#192a38`, selected `#1c2f40`, border `#2e475b`, dim `#7e9e99`, text `#c5ccb8`, accent `#95c5ac`, Hunting `#7ca1c0`, Needs help `#f3a787`, Cleared `#6eaa78`, HP `#c38890`. Text and signal colors come from the Vinik24, Chasm and Cryptic Ocean palettes; the dark ramp is Vinik24 `#387080` darkened. Every text color is at least 4.5:1 on chrome and selected.
- **Fonts**: Pixelify Sans (UI, 15 px) and Press Start 2P (logo), both OFL, shipped in the mod's fonts folder.

## Testing Decisions

- **A good test** feeds a snapshot in and checks the view model out. It never checks internals, render calls or how state is stored.
- **Seam 1, the hunt model** (main seam), tested with Node's built-in test runner and no Herdr. Cases:
  - map cycling past six spaces;
  - Class order across Areas, cycling, and config overrides;
  - state mapping and the worst-state dot;
  - arena pick of four by priority and `+N`;
  - Slain only when nobody is Hunting and someone is done, with a mixed Party staying alive;
  - Respawn on new Hunting;
  - HP wearing with injected time;
  - auto-expand for the current Area and Needs help, and a manual collapse winning after restart;
  - branch shown only when different;
  - grade table, unknown model as `?`;
  - Stamina levels at 50% and 20%, `—` with no data, stale marking;
  - path display (`~`, shortening, no branch outside git).
- **Seam 2, the statusLine script**, tested as a black box: JSON on stdin produces the expected session file. Control and bidi characters are stripped, and malformed input doesn't crash.
- **Not automated**: rendering. Each mod must pass `herdr-app check`, the layout must switch with `layout.switch`, and a `herdr-app shot` is compared by eye with `docs/records/2026-11-05-preview.html`.
- **Prior art**: none in this repo or the references. herdr-kaiju and herdr-traveler ship without tests. This spec introduces the first ones.

## Out of Scope

- Snow, Volcano and Swamp Areas (the floor tileset does have snow and lava-like ground, so they're a cheap follow-up). Moving Giant Spirit to Volcano.
- More than one Monster per map, or random Monsters on Respawn.
- News card for background agents, collapsed sidebar mode, light theme.
- Rank and Stamina for Codex/OpenCode (they show `?` and `—`).
- Remote-machine session data.
- HP tied to real progress.

## Further Notes

- Ninja Adventure has no Cleric, so Samurai is the sixth Class. The `Hunter` character carries a bow and serves as the Archer.
- Monster sprite sizes vary from 40 to 68 px, so the arena aligns Monsters by their feet.
- `image()` remembers a missing path, so art must exist before a mod references it. Herdr caches backgrounds by file name, so a changed image needs a new name (traveler's lessons).
- The preview assets in `docs/records/` came from a public mirror of the pack and are only for the mock. The layout itself takes them from the official zip.

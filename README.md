# Pixel Hunter — a Herdr layout

A monster-hunting, 8-bit pixel RPG layout for the [Herdr app](https://herdr.dev),
with only original characters: spaces become hunting Areas with their own
Monster, and agents become a Party of Hunters. Everything lives in
[`pixel-hunter/`](pixel-hunter/); see its [RECIPE.md](pixel-hunter/RECIPE.md).

![Pixel Hunter](pixel-hunter/preview.png)

## Install

Ask your Herdr agent to add this repo's `pixel-hunter/` folder, or copy
`pixel-hunter/layouts/*` into `~/.config/herdr-app/layouts/` and
`pixel-hunter/mods/*` into `~/.config/herdr-app/mods/`, then run
`layout.switch pixel-hunter`. `ctrl-shift-l` switches back.

## Rank and Stamina (optional, Claude Code)

Each Hunter row shows its **Rank** (a letter grade and the model, like
`[A] Opus 5.5`) and its **Stamina** (the context window left, as a bar).
Herdr doesn't know either, so they come from a small Claude Code
[statusLine](https://docs.claude.com/en/docs/claude-code/statusline) script
that ships with the mod. Without it every Hunter shows its program name
(`[?] Claude Code`, `[?] codex`) and `STA —`. Nothing is ever estimated.

One-time setup (needs `node` on your PATH): add this to `~/.claude/settings.json`
(or a project's `.claude/settings.json`):

```json
{
  "statusLine": {
    "type": "command",
    "command": "node ~/.config/herdr-app/mods/pixel-hunter/statusline.mjs",
    "refreshInterval": 60
  }
}
```

- The script reads the session JSON Claude Code sends it, and writes the
  model's name and `context_window.remaining_percentage` for the Herdr
  terminal it runs in (`HC_TERMINAL_ID`) to
  `~/.config/herdr-app/data/pixel-hunter/sessions/<terminal>.json`. Control
  and bidi characters are stripped. Outside Herdr it writes nothing.
- It prints a short status line of its own (`Opus 5.5 · 62% context left`).
  To keep your own status line instead, call it from yours with `--quiet`,
  passing the same JSON on stdin:
  `input=$(cat); printf '%s' "$input" | node ~/.config/herdr-app/mods/pixel-hunter/statusline.mjs --quiet`.
- `refreshInterval` keeps a quiet session's record fresh. Without it, an idle
  session's Stamina is marked `old` after the freshness limit (5 minutes),
  because Claude Code only runs the script when the conversation changes.

Stamina is blue at 50% and up, cream from 20% to 50%, peach below 20%, and
dim with `old` once the record is older than the limit.

### The grade table

`~/.config/herdr-app/mods/pixel-hunter/rank.json` maps a word in the model's
name to its grade. The first word found wins, case doesn't matter, and any
other model shows `?`. Saving the file updates the sidebar at once.

```json
{
  "grades": { "Fable": "S", "Opus": "A", "Sonnet": "B", "Haiku": "C" },
  "staleAfterSeconds": 300
}
```

`staleAfterSeconds` is the freshness limit. A broken file falls back to these
defaults.

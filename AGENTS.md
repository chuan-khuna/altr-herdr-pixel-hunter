# herdr-monster-hunter

This repo shares one Herdr layout, **pixel-hunter**, so it shows up at
herdr.dev/layouts: a monster-hunting, 8-bit pixel RPG skin with only original
characters (no Monster Hunter names, monsters or UI). The repo directory keeps
its old `herdr-monster-hunter` name. The rules for layouts, mods and sharing
live in `~/.config/herdr-app/AGENTS.md` (rewritten by the Herdr app on every start).
Read its **Layouts**, **Mods** and **Share** sections before touching anything.

## Where things live

- **Build in the live config, not here.** The layout is developed in
  `~/.config/herdr-app/layouts/pixel-hunter.json`,
  `~/.config/herdr-app/themes/pixel-hunter*.json` and
  `~/.config/herdr-app/mods/pixel-hunter*/` (fonts in its `fonts/`), where the window redraws as you
  edit. This repo holds a copy.
- `pixel-hunter/` is the shared folder, laid out like the Herdr home:

  ```
  pixel-hunter/
    layouts/pixel-hunter.json   (+ its preview svg/png if the layout names one)
    themes/pixel-hunter-night.json
    mods/<each mod the layout uses that isn't shipped by Herdr>/
    RECIPE.md                     brief another agent builds it from, empty folder
    preview.png                   screenshot of the layout running
    LICENSE                       MIT for the code (art is CC0, fonts OFL; not synced)
  ```

- `scripts/sync.sh` copies the live layout, its `pixel-hunter*` themes and mods into
  `pixel-hunter/`. Run it before every commit. Drop generated files a fresh
  install recreates (`gpui-kit.d.ts`, `jsconfig.json`) if the script copies them.
- The hunt model (`mods/pixel-hunter/hunt.js`, no Herdr imports) has tests:
  `cd ~/.config/herdr-app/mods/pixel-hunter && node --test`. Run them after
  every model change.

## Publishing checklist

1. Layout works: `herdr-app check ~/.config/herdr-app/mods/<mod>` passes for
   each mod, and `layout.switch pixel-hunter` shows it.
2. `scripts/sync.sh`.
3. `RECIPE.md` written **from the real files**, in the order the Herdr
   AGENTS.md gives (Name + paragraph + image, What you see, How it behaves,
   Built from, Watch out, Done when). Exact values (`#ab7748`, 29px,
   `agent.focus`), nothing the build doesn't do. Replace every `TODO`.
4. `preview.png`: a screenshot of the real window with the layout active.
5. Push to a **public** GitHub repo and add the topic `herdr-layout`:
   `gh repo edit --add-topic herdr-layout` (or Settings → Topics).
   It appears at herdr.dev/layouts within the hour.

Never list a shipped Herdr mod (e.g. `files`, `changes`) as part of this
layout's folder; reference it by name in RECIPE.md's **Built from** instead.

## Project docs

### Documents

Documents about this project, including how it is implemented, live in
`docs/documents/<topic>.md` (or `.html`). `docs/documents/INDEX.md` is the
entry point: it lists every document as one bullet,
`- [Title](file) — one-line summary`.

- Read the index before working on an area, and open the documents relevant to it.
- When you add, rename or remove a document, update `INDEX.md` in the same change.
- Keep documents in step with the code they describe: if a change makes a
  document wrong, fix the document in the same change.

### Records

Discussion records live at `docs/records/yyyy-mm-dd-<topic>.md` (or `.html`
for visual records such as mocks and palettes), dated the day the discussion
took place. Each record captures one discussion: what was discussed, what was
decided, and any open questions. Records are history: don't rewrite a past
decision in one. Record a new discussion instead. You may still fix a mock so
it shows the current design, as long as the record says so.

### HTML documents and records

- **Theme:** link the shared stylesheet `docs/styles/pixel-hunter.css`
  (`<link rel="stylesheet" href="../styles/pixel-hunter.css">`). It holds the
  pixel-hunter-night tokens (`--canvas`, `--accent`, `--help`, …), the base
  type, square 2 px pixel frames (`.card`), tables, the TOC, diagram frames and
  thin themed scrollbars. Put page-only rules in the page's own `<style>`
  after the link. Add a rule to the shared file only when two pages need it.
  The theme is dark only, so there is no theme switcher.
- **Code blocks:** highlight with Shiki on a dark theme (Catppuccin Mocha or
  Rosé Pine Moon). The stylesheet puts the block on `--canvas`.
- **Diagrams:** write them in Mermaid and render with Pele (pele.run/api),
  inside `<figure class="diagram">`. Make them expandable and zoomable, with
  expand, close and zoom icon buttons in `.controls`.
- **Shape:** square corners and 2 px frames, as the layout does (spec: no
  rounded corners). Do not use the usual 3–6 px radius.
- Include a table of contents (`<nav class="toc card">`).
- **Thai body text:** use the looped Thai font Noto Sans Thai Looped. It is in
  the stylesheet's font stack and applies to `:lang(th)` or `.th`.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

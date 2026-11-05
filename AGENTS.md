# herdr-monster-hunter

This repo shares one Herdr layout, **monster-hunter**, so it shows up at
herdr.dev/layouts. The rules for layouts, mods and sharing live in
`~/.config/herdr-app/AGENTS.md` (rewritten by the Herdr app on every start).
Read its **Layouts**, **Mods** and **Share** sections before touching anything.

## Where things live

- **Build in the live config, not here.** The layout is developed in
  `~/.config/herdr-app/layouts/monster-hunter.json` and
  `~/.config/herdr-app/mods/monster-hunter*/`, where the window redraws as you
  edit. This repo holds a copy.
- `monster-hunter/` is the shared folder, laid out like the Herdr home:

  ```
  monster-hunter/
    layouts/monster-hunter.json   (+ its preview svg/png if the layout names one)
    mods/<each mod the layout uses that isn't shipped by Herdr>/
    RECIPE.md                     brief another agent builds it from, empty folder
    preview.png                   screenshot of the layout running
  ```

- `scripts/sync.sh` copies the live layout and its `monster-hunter*` mods into
  `monster-hunter/`. Run it before every commit. Drop generated files a fresh
  install recreates (`gpui-kit.d.ts`, `jsconfig.json`) if the script copies them.

## Publishing checklist

1. Layout works: `herdr-app check ~/.config/herdr-app/mods/<mod>` passes for
   each mod, and `layout.switch monster-hunter` shows it.
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

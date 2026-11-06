# 04: Hunter row layout F

**What to build:** Hunter rows follow layout F from `docs/records/2026-11-05-hunter-row.html`:

- **Left edge:** a 4 px strip in the state colour.
- **Line 1:** the Herdr tab name as the Hunter's name. After it, in dim text: the Class, the program (only when it isn't Claude Code) and the branch (only when it differs from the Area's). The state icon sits on the right.
- **Line 2:** the Rank grade and model. On the right, used/total context tokens (`128k/200k`, `410k/1M`) beside the Stamina bar. The bar still shows what's left, in blue/cream/peach.

With no data the row shows `STA —` and no number. A Hunter that Needs help keeps its peach frame.

**Blocked by:** None (can start immediately).

**Token fields (verified in ticket 01):** used = `context_window.total_input_tokens` (input + cache creation + cache read, from the last API response), total = `context_window.context_window_size` (`200000`, or `1000000` for 1M models). Both are present from the first tick; used is `0` before the first response, while `current_usage`, `used_percentage` and `remaining_percentage` are `null` then. Treat used `0` as no data yet.

**Status:** done

- [x] The statusLine script also records used and total context tokens when Claude Code reports them, and never computes them from percentages. Its black-box tests cover present and absent token fields.
- [x] Each Hunter gains:
  - `name`: the tab name, falling back to the Class name
  - `programLabel`: null for Claude Code
  - `tokens`: `{ used, size, text }`, or null
- [x] Hunt model tests:
  - the tab name, and the Class fallback
  - `programLabel` is null for Claude Code and the program name otherwise
  - token text for 200k and 1M windows, and null without data
  - an old record without tokens shows only the bar
- [x] Rows render as layout F, and screenshots of the live window and the demo snapshot match the record
- [x] Pane headers and tabs are unchanged
- [x] `node --test` and `herdr-app check` pass

## Comments

- Done in the live config, then `scripts/sync.sh`.
  - `statusline.mjs`: the record gains `used` (`context_window.total_input_tokens`) and `size` (`context_window.context_window_size`). Each is a rounded whole number ≥ 0, else null. A size of 0 is stored as null. Neither is ever derived from the percentages. A record with only tokens is still written, and a change in either rewrites it at once. It stays `v: 1` (additive).
  - `hunt.js`: each Hunter gains three fields:
    - `name`: the tab name, trimmed, else the Class name.
    - `programLabel`: null for `app: "claude-code"`, for a program called Claude Code/claude, or with no program; else the program name.
    - `tokens`: `{ used, size, text }`, null unless both are present and used > 0. `text` comes from the new exported `tokenText()`: `128k/200k`, `410k/1M`, `1.5M`.
  - `areas.js`: `hunterRow` follows layout F:
    - The row is an `items_stretch` h_flex: a 4 px state-colour strip (inside the 4 px vertical padding, no left padding), then `body`.
    - Line 1: the name (semibold, truncates), then dim 13 px `Class · program · ⎇ branch` (flex_1, truncates first), then the state icon alone on the right (13 px semibold, the state name as tooltip).
    - Line 2: the grade tag and the model (truncates), then on the right the tokens (12 px) and the Stamina bar, now 44 px (`STAMINA_W`; was 46).
    - The peach frame and tint for Needs help are unchanged.
    - The Pet line (ticket 05) belongs in `body`, under the face-and-lines row, so the strip grows with it. It isn't built.
    - `pane.js` and `tabs.js` are untouched. The helpers they import (`gradeBadge`, `stateColor`, `stateText`, `plain`, `smallFace`) are unchanged.
  - `demo.js`: shop-api now holds the record's five Hunters, each in its own named tab:
    - login/Knight
    - cart/Mage: Needs help, `fix/cart`
    - tests/Rogue: `410k/1M`
    - api/Monk: Codex, no record
    - docs/Samurai: `170k/200k`, low

    Login fix's Hunter has an old-style record without tokens.
- Tests: 6 new (59 in all).
  - statusline black-box:
    - tokens for 200k and 1M windows
    - the first tick (`used: 0`, percentages null)
    - absent, odd and zero-size fields: null, never derived
    - a tokens-only record
    - a change in used tokens rewrites at once
  - hunt:
    - the tab name with the Class fallback, which doesn't change Classes
    - `programLabel` for Claude Code and others
    - token text for 200k/1M, and null without data or with used 0
    - an old record without tokens shows only the bar
- Verified: `node --test` 59/59; `herdr-app check` passes; `herdr-app status` errors `[]`. Shots in `04-shots/` are cropped to the sidebar at 2×, because the full window shows my own session.
  - `live-sidebar.png`:
    - **Setup.** A temporary space `ph04` (a git folder on `feat/login`) ran four Git Bash fake agents, which print OSC 7501 `state=` from files. Tabs:
      - login: working
      - cart: blocked, cwd a repo on `fix/cart`
      - api: idle
      - docs: working
    - **Records.** I piped statusLine JSON through the real `statusline.mjs` with `HC_TERMINAL_ID` set:
      - login: `128k/200k`
      - cart: `410k/1M`
      - api: none, so `STA —` and no number
      - docs: a hand-written old-style record without tokens, so the bar only
      - my own Claude Code terminal (t9, tab `tab 1`): a synthetic `172k/200k`. It shows no program after its Class, because it is Claude Code.
    - **Program label.** The fake agents report no `app` (OSC 7501 `;app=` wasn't accepted in that form), so they show `· bash`. That covers the non-Claude program case.
  - `live-stale-sidebar.png`: login's record back-dated an hour. `128k/200k old` and a dim bar still fit the row.
  - `demo-sidebar.png` and `record-F.png`:
    - **Demo shot.** The layout's sidebar props got `"demo": true` for the shot. The layout file was then restored and checked byte for byte with `cmp`.
    - **Record shot.** `record-F.png` is the record's layout F, rendered with headless Chrome.
    - **They match** in:
      - strip colours
      - names
      - the dim `Class · program · ⎇ branch` text
      - icons
      - grades and models
      - tokens and bar fills
      - the peach frame on cart
    - **Differences** come from the data, not the row:
      - The record gives the Codex Hunter a `gpt-5.5` model. The demo's Codex has no record, so it shows `[?] Codex`.
      - The record also draws Pet lines (ticket 05).
  - `live-tabs-header.png`: the tab bar and pane header, unchanged: Class, grade, Rank, folder, branch, `HUNTING`.
  - **Cleanup.** I closed `ph04` and deleted the temporary session records (t2f, t2g, t2j, t9). Then I focused the space, tab and pane I started on (t9).
- Docs:
  - `RECIPE.md`, updated from the files:
    - the intro
    - Hunter rows
    - the pane header label wording
    - Rank, Stamina and tokens
    - the `hunt()` fields
    - the statusline record
    - the test count
    - Done when
  - `README.md`: the Rank and Stamina section.
  - New `docs/documents/hunter-row.md`, listed in `INDEX.md`.
- Not verified:
  - A real Claude Code statusLine tick feeding tokens: the user's settings have no statusLine. The script was fed JSON shaped like ticket 01's verified payload.
  - A tab with no name at all, which would show the Class fallback. Herdr always names tabs (`tab 1`), so only the model test covers it.
  - The state-icon tooltip on a real hover.
  - `pixel-hunter/preview.png` still shows the old rows.

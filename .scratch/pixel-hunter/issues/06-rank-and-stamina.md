# 06: Rank and Stamina via statusLine script

**What to build:** An optional Claude Code statusLine script that records, per terminal, the context window left and the model name (stripping control and bidi characters). The Hunter rows and the pane data read those records. Rank shows as a letter grade plus the model, like `[A] Opus 5.5`, from an editable grade table (Fable S, Opus A, Sonnet B, Haiku C, else `?` with the program name). Stamina is a bar: blue at 50% and up, cream from 20% to 50%, peach below 20%, with no blinking. It shows `—` with no data and is marked `old` past a freshness limit. Nothing is ever estimated. The README explains the one-time setup.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Script black-box tests: JSON on stdin produces the expected session record; control/bidi characters are stripped; malformed input doesn't crash it
- [ ] Hunt model tests cover the grade table, unknown model as `?`, the Stamina levels at exactly 50% and 20%, `—` with no record, and stale marking
- [ ] Changing the grade table changes the grade without code changes
- [ ] Without the script installed, every Hunter shows its program name and `STA —`
- [ ] `herdr-app check` passes

# 01: Verify Claude Code hook facts for Pets

**What to build:** Run a real Claude Code session inside a Herdr terminal with temporary logging hooks (SubagentStart, SubagentStop, PermissionRequest, PostToolUse) and a logging `subagentStatusLine`. Start foreground, background and nested subagents, and trigger a permission prompt from inside a subagent. Record what actually arrives, then update the Pet design where the docs were wrong. The user's real settings are restored afterwards.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Answered with captured payloads: does `PermissionRequest` carry `agent_id` when a subagent asks for permission?
- [x] Answered: does `tasks[].id` in the `subagentStatusLine` input equal the hook `agent_id`? If not, which fields match them reliably?
- [x] Answered: does `SubagentStop` fire for background subagents, and for nested ones?
- [x] Answered: does `HC_TERMINAL_ID` reach hook processes and the `subagentStatusLine` process?
- [x] Answered: the exact `subagentStatusLine` settings shape, whether it ticks while the main session is idle, and how that relates to the statusLine `refreshInterval`
- [x] Answered: does the statusLine input report used and total context tokens (for ticket 04), and in which fields?
- [x] The "Verify before relying on it" section of `docs/documents/pet-tracking-hooks.md` is replaced with the findings. If a fallback applies, the spec's Further Notes and tickets 05/06 are amended to match.
- [x] The user's Claude Code settings are unchanged at the end

## Comments

**2026-11-05, ticket 01 done.** Ran Claude Code 2.1.318 in Herdr terminal `t24` with logging hooks, `statusLine` and `subagentStatusLine` in a throwaway project's `.claude/settings.local.json`. `~/.claude/settings.json` was never edited (same SHA-256 before and after). The only user-level side effect is the folder-trust entry Claude Code keeps for the throwaway folder. Full findings and trimmed payloads are in `docs/documents/pet-tracking-hooks.md`, "Verified behaviour (ticket 01)".

- `PermissionRequest` carries `agent_id` and `agent_type` for a subagent's prompt; a main-session prompt has neither.
- `tasks[].id` equals the hook `agent_id`, and `agentType` equals `agent_type`.
- `SubagentStop` fires for background subagents and for nested ones. A nested parent also stops while it waits for its child, then gets a second `SubagentStart` with the same `agent_id`. Internal agents fire `SubagentStop` with `agent_type: ""` and no start.
- `HC_TERMINAL_ID` reached every hook and both status-line commands.
- `subagentStatusLine` is `{ "type": "command", "command": "…" }`. It ticks every 5 s while the agent panel has a row, also while the Hunter is idle, independent of the statusLine `refreshInterval` (tested at 3 and 10).
- **Fallback:** neither command ticks while a permission prompt is open (114 s seen). Needs help Pets are exempt from the stale drop, and a tick after the prompt closes clears Needs help (also covers denial, which fires no `PostToolUse`). Spec and tickets 05 and 06 are amended.
- Tokens for ticket 04: `context_window.total_input_tokens` and `context_window.context_window_size`.
- Not observed: a foreground subagent (2.1.318 ran every Agent call in the background), and a tool that fails after approval.

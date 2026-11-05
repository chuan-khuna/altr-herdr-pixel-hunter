# 01: Verify Claude Code hook facts for Pets

**What to build:** Run a real Claude Code session inside a Herdr terminal with temporary logging hooks (SubagentStart, SubagentStop, PermissionRequest, PostToolUse) and a logging `subagentStatusLine`. Start foreground, background and nested subagents, and trigger a permission prompt from inside a subagent. Record what actually arrives, then update the Pet design where the docs were wrong. The user's real settings are restored afterwards.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Answered with captured payloads: does `PermissionRequest` carry `agent_id` when a subagent asks for permission?
- [ ] Answered: does `tasks[].id` in the `subagentStatusLine` input equal the hook `agent_id`? If not, which fields match them reliably?
- [ ] Answered: does `SubagentStop` fire for background subagents, and for nested ones?
- [ ] Answered: does `HC_TERMINAL_ID` reach hook processes and the `subagentStatusLine` process?
- [ ] Answered: the exact `subagentStatusLine` settings shape, whether it ticks while the main session is idle, and how that relates to the statusLine `refreshInterval`
- [ ] Answered: does the statusLine input report used and total context tokens (for ticket 04), and in which fields?
- [ ] The "Verify before relying on it" section of `docs/documents/pet-tracking-hooks.md` is replaced with the findings. If a fallback applies, the spec's Further Notes and tickets 05/06 are amended to match.
- [ ] The user's Claude Code settings are unchanged at the end

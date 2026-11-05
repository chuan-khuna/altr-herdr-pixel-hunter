// The one place that reads Herdr for the hunt model: builds the snapshot, runs hunt(),
// and keeps the persisted part in shared state (on disk, the same for every copy).
import { spaces, panes, terminals, keys, home, shared, setShared, props } from "herdr";
import { hunt, keyLabel, toggleArea } from "./hunt.js";
import { DEMO, demoSessions } from "./demo.js";

export const STATE_KEY = "pixel-hunter.state";

// The shortcut that selects each space: { 1: "⌃1", ... } from the person's keys.
function spaceKeys() {
  const out = {};
  for (const k of keys() ?? []) {
    if (!k) continue;
    const m = /^space\.select:(\d+)$/.exec(k.action ?? "");
    const label = m && k.section === "global" ? keyLabel(k.keys) : null;
    if (label && !out[m[1]]) out[m[1]] = label;
  }
  return out;
}

// `self`: the role's View, holding the session records and grade table (sessions.js) and the
// Class pins (pins.js).
// The chevron: remember the opposite of what `area` (from world()) shows now, for its space.
// Not in demo mode (the snapshot is never persisted).
export function toggleExpanded(area) {
  if (props()?.demo) return;
  const state = shared(STATE_KEY) ?? {};
  const next = toggleArea(state, area);
  if (next !== state) setShared(STATE_KEY, next);
}

export function world(self, now = Date.now()) {
  if (props()?.demo) return hunt({ ...DEMO, sessions: demoSessions(now), ranks: self?.ranks ?? null, pins: self?.pins ?? null, now }); // a screenshot snapshot, never persisted
  const state = shared(STATE_KEY) ?? {};
  // herdr-core's own status per terminal: it keeps "done" after Herdr shows the agent as seen
  const report = new Map((terminals() ?? []).filter(Boolean).map((t) => [t.address, t.status]));
  const out = hunt({
    spaces: spaces().map((s) => ({
      id: s.id, name: s.name, named: s.named, folder: s.folder, branch: s.branch, active: s.active,
      tabs: (s.tabs ?? []).map((t) => ({ id: t.id, index: t.index, name: t.name, named: t.named })),
    })),
    panes: panes().map((p) => ({
      pane: p.pane, terminal: p.terminal, tab: p.tab, status: p.status,
      program: p.program?.name ?? p.app ?? null, cwd: p.cwd, branch: p.branch, focused: p.focused,
      report: report.get(p.terminal) ?? null, app: p.app ?? null,
    })),
    home: home(),
    keys: spaceKeys(),
    state,
    sessions: self?.sessions ?? {},
    ranks: self?.ranks ?? null,
    pins: self?.pins ?? null,
    now,
  });
  // Until classes.json is read (pins.js), a pinned Hunter would get a Class by order: show it
  // with what it had, but don't write that down, or the copies would fight over it.
  if (self?.pins !== undefined && JSON.stringify(out.state) !== JSON.stringify(state)) setShared(STATE_KEY, out.state);
  return out;
}

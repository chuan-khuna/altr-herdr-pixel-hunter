// The one place that reads Herdr for the hunt model: builds the snapshot, runs hunt(),
// and keeps the persisted part in shared state (on disk, the same for every copy).
import { spaces, panes, keys, home, shared, setShared, props } from "herdr";
import { hunt, keyLabel } from "./hunt.js";
import { DEMO } from "./demo.js";

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

export function world(now = Date.now()) {
  if (props()?.demo) return hunt({ ...DEMO, now }); // a screenshot snapshot, never persisted
  const state = shared(STATE_KEY) ?? {};
  const out = hunt({
    spaces: spaces().map((s) => ({
      id: s.id, name: s.name, named: s.named, folder: s.folder, branch: s.branch, active: s.active,
      tabs: (s.tabs ?? []).map((t) => ({ id: t.id, index: t.index })),
    })),
    panes: panes().map((p) => ({
      pane: p.pane, terminal: p.terminal, tab: p.tab, status: p.status,
      program: p.program?.name ?? p.app ?? null, cwd: p.cwd, branch: p.branch, focused: p.focused,
    })),
    home: home(),
    keys: spaceKeys(),
    state,
    now,
  });
  if (JSON.stringify(out.state) !== JSON.stringify(state)) setShared(STATE_KEY, out.state);
  return out;
}

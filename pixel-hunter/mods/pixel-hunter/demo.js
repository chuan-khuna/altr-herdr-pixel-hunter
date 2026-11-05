// A fixed snapshot shaped like the preview mock (docs/records/2026-11-05-preview.html), for
// screenshots: a block with props { role: "sidebar", demo: true } draws it through the real
// hunt model instead of the live workspace. Clicks still run real commands with these fake ids.
const H = "/Users/me";
const tab = (id) => [{ id, index: 1 }];
export const DEMO = {
  home: H,
  keys: { 1: "⌃1", 2: "⌃2", 3: "⌃3", 4: "⌃4" },
  spaces: [
    { id: "d1", name: "shop-api", named: false, folder: "", branch: "feat/login", active: true, tabs: tab("dt1") },
    { id: "d2", name: "herdr-monster-hunter", named: false, folder: "", branch: "main", active: false, tabs: tab("dt2") },
    { id: "d3", name: "Login fix", named: true, folder: "", branch: "fix/session", active: false, tabs: tab("dt3") },
    { id: "d4", name: "dotfiles", named: false, folder: "", branch: null, active: false, tabs: tab("dt4") },
  ],
  panes: [
    { pane: "dp1", terminal: "dx1", tab: "dt1", status: "working", program: "Claude Code", cwd: `${H}/code/shop-api`, branch: "feat/login" },
    { pane: "dp2", terminal: "dx2", tab: "dt1", status: "blocked", program: "Claude Code", cwd: `${H}/code/shop-api-cart`, branch: "fix/cart" },
    { pane: "dp3", terminal: "dx3", tab: "dt1", status: "done", program: "codex", cwd: `${H}/code/shop-api`, branch: "feat/login" },
    { pane: "dp4", terminal: "dx4", tab: "dt1", status: "idle", program: "Claude Code", cwd: `${H}/code/shop-api`, branch: "feat/login" },
    { pane: "dp5", terminal: "dx5", tab: "dt2", status: null, program: "zsh", cwd: `${H}/Documents/code/personal/herdr-monster-hunter`, branch: "main" },
    { pane: "dp6", terminal: "dx6", tab: "dt3", status: "working", program: "Claude Code", cwd: `${H}/code/auth-service`, branch: "fix/session" },
    { pane: "dp7", terminal: "dx7", tab: "dt4", status: null, program: "zsh", cwd: `${H}/dotfiles`, branch: null },
  ],
};

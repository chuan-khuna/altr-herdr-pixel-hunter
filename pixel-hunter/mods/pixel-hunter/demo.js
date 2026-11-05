// A fixed snapshot shaped like the preview mock (docs/records/2026-11-05-preview.html) and the
// Hunter row record (docs/records/2026-11-05-hunter-row.html, layout F), for screenshots: a
// block with props { role: "sidebar", demo: true } draws it through the real hunt model
// instead of the live workspace. Clicks still run real commands with these fake ids. Pets come
// from demoPets() below.
const H = "/Users/me";
const tab = (id, name, index = 1) => ({ id, index, name, named: true });
export const DEMO = {
  home: H,
  keys: { 1: "⌃1", 2: "⌃2", 3: "⌃3", 4: "⌃4" },
  // Monster HP as in the mock: shop-api worn to 58 and fighting, the Desert Monster Slain,
  // Login fix at 80, dotfiles untouched (full). Login fix (Dungeon) has had a Respawn: its
  // Monster is the Giant Frog, not the map's own Giant Spirit.
  // Classes as in the Hunter row record: Knight, Mage, Rogue, Monk, Samurai in shop-api.
  state: {
    monsters: { d1: { hp: 58, since: null, slain: false }, d2: { hp: 0, since: null, slain: true }, d3: { hp: 80, since: null, slain: false, id: "GiantFrog" } },
    classes: { dx1: "Knight", dx2: "Mage", dx3: "Rogue", dx4: "Monk", dx5: "Samurai", dx6: "Archer" },
  },
  spaces: [
    { id: "d1", name: "shop-api", named: false, folder: "", branch: "feat/login", active: true,
      tabs: [tab("dt1", "login", 1), tab("dt1b", "cart", 2), tab("dt1c", "tests", 3), tab("dt1d", "api", 4), tab("dt1e", "docs", 5)] },
    { id: "d2", name: "herdr-monster-hunter", named: false, folder: "", branch: "main", active: false, tabs: [tab("dt2", "tab 1")] },
    { id: "d3", name: "Login fix", named: true, folder: "", branch: "fix/session", active: false, tabs: [tab("dt3", "session")] },
    { id: "d4", name: "dotfiles", named: false, folder: "", branch: null, active: false, tabs: [tab("dt4", "tab 1")] },
  ],
  panes: [
    { pane: "dp1", terminal: "dx1", tab: "dt1", status: "working", program: "Claude Code", cwd: `${H}/code/shop-api`, branch: "feat/login" },
    { pane: "dp2", terminal: "dx2", tab: "dt1b", status: "blocked", program: "Claude Code", cwd: `${H}/code/shop-api-cart`, branch: "fix/cart" },
    { pane: "dp3", terminal: "dx3", tab: "dt1c", status: "done", program: "Claude Code", cwd: `${H}/code/shop-api`, branch: "feat/login" },
    { pane: "dp4", terminal: "dx4", tab: "dt1d", status: "idle", program: "Codex", cwd: `${H}/code/shop-api`, branch: "feat/login" },
    { pane: "dp5", terminal: "dx5", tab: "dt1e", status: "working", program: "Claude Code", cwd: `${H}/code/shop-api`, branch: "feat/login" },
    { pane: "dp6", terminal: "dx6", tab: "dt2", status: null, program: "zsh", cwd: `${H}/Documents/code/personal/herdr-monster-hunter`, branch: "main" },
    { pane: "dp7", terminal: "dx7", tab: "dt3", status: "working", program: "Claude Code", cwd: `${H}/code/auth-service`, branch: "fix/session" },
    { pane: "dp8", terminal: "dx8", tab: "dt4", status: null, program: "zsh", cwd: `${H}/dotfiles`, branch: null },
  ],
};

// Session records as the statusLine script writes them, as in the Hunter row record: login
// 128k/200k, cart 52k/200k, tests 410k/1M, docs 170k/200k (low), the Codex Hunter with none
// (? and STA —). Login fix's record is from before ticket 04: no tokens, so only the bar.
export function demoSessions(now) {
  const r = (model, used, size, age = 0) => ({ v: 1, app: "claude-code", model, left: (100 * (size - used)) / size, used, size, at: now - age });
  return {
    dx1: r("Opus 5.5", 128000, 200000),
    dx2: r("Sonnet 5.5", 52000, 200000),
    dx3: r("Opus 5.5 1M", 410000, 1000000),
    dx5: r("Haiku 5.5", 170000, 200000),
    dx7: { v: 1, app: "claude-code", model: "Fable 5.1", left: 41, at: now },
  };
}

// Pet records as the Pets hook script writes them, as in the Hunter row record: login has five
// (Dog and Cat shown, [+3] for Frog, Cub and Racoon), cart one, docs one. Pet Needs help is
// ticket 06, so cart's Frog is Hunting for now.
export function demoPets(now) {
  const p = (agent, animal, type, description, age) => ({ v: 1, app: "claude-code", agent, type, description,
    animal, state: "hunting", startedAt: now - age, seenAt: now });
  return {
    dx1: [
      p("dpa1", "Dog", "Explore", "find auth middleware", 300000),
      p("dpa2", "Cat", "general-purpose", "run the test suite", 240000),
      p("dpa3", "Frog", "Explore", "list the session cookies", 120000),
      p("dpa4", "Cub", "Plan", "plan the token refresh", 60000),
      p("dpa5", "Racoon", "general-purpose", "update the login docs", 30000),
    ],
    dx2: [p("dpb1", "Frog", "Plan", "draft the price migration", 90000)],
    dx5: [p("dpc1", "Dog2", "Explore", "collect merged PR titles", 45000)],
  };
}

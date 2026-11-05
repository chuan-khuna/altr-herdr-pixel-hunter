// The hunt model: pure logic, no Herdr imports, so `node --test` runs it as is and every
// role (sidebar, later tabs and pane headers) reads the same world.
//
//   hunt(snapshot) -> { areas, state }
//
// snapshot:
//   spaces  [{ id, name, named, folder, branch, active, tabs: [{ id, index }] }] in Herdr's order
//   panes   [{ pane, terminal, tab, status, program, cwd, branch, focused }]
//           status: "working" | "blocked" | "done" | "idle" | null (null: not an agent)
//           program: the program's name for people ("Claude Code"), the Rank label with no record
//           app:     optional, what the agent reported (OSC 7501 app, "claude-code"); a session
//                    record written by another app (an old Claude run in that terminal) is ignored
//           report: optional, the agent's own last status in herdr-core. Herdr shows "done" only
//                   until someone looks, then "idle"; the core keeps "done". The Monster uses it
//                   so a hunt finished while you watch still counts as done.
//   home    the home folder, for "~"
//   keys    optional { [spaceIndexFrom1]: "⌃1" }, the shortcut that selects each space
//   state   persisted state from last time (see below); unknown fields are kept as they are
//   sessions optional { [terminal]: record } from the statusLine script (statusline.mjs):
//           { app, model, left, at }: the model's name, the context window left in % (null:
//           not known yet), written at `at` ms. Bad fields are ignored; nothing is estimated.
//   ranks   optional { grades: { [word]: grade }, staleAfterSeconds } (rank.json); missing or
//           bad parts fall back to RANKS
//   now     ms, passed in, never read from a clock here, so HP wear and staleness are deterministic
//
// Output:
//   areas   [{ id, index, name, named, current, map, monster, worst, path, branch, key, hunters, arena,
//              tabs, hp, mode, wearing }]
//           map     { id: "forest", name: "Forest", monsters: [...] }
//           monster { id: "GiantRacoon", name: "Giant Racoon" }  (the pack's sprite folder)
//           worst   the worst hunt state in the Party, or null with no Hunters
//           path    the first terminal's folder for display ("~/code/x", shortened when long)
//           branch  that terminal's git branch, null outside git
//           arena   { hunters, more }: up to ARENA_MAX Hunters for the arena, most urgent first
//                   (Needs help, Hunting, Cleared, Resting; ties keep their order), and how
//                   many more there are (shown as "+N")
//           hp      the Monster's HP now, 0..HP_MAX (cosmetic); 0 only when Slain
//           mode    "hit" while anyone in the Party is Hunting, "slain" once nobody is Hunting
//                   and someone's agent is done (Cleared, or seen and Resting with the core
//                   still saying done); it stays Slain until someone Hunts again (Respawn
//                   with full HP); else "idle"
//           wearing true while HP is wearing down (mode "hit"); see hpAfter()
//           tabs    [{ id, index, lead, worst, hunters }] in tab order, for the tab bar: lead is the
//                   tab's first Hunter in pane order (its face), or null with no agent (a map
//                   icon); worst its most urgent hunt state (the dot), or null; hunters how many
//   hunters [{ terminal, pane, tab, cls, state, status, program, rank, stamina, branch, focused }]
//           cls     { name: "Knight", sprite: "Knight" }
//           rank    { grade: "A", label: "Opus 5.5", text: "[A] Opus 5.5" }: grade "?" for a
//                   model the table doesn't know; with no record, "?" and the program's name
//           stamina { percent: 62, level: "high" | "mid" | "low", stale, staleAt }, or with no
//                   record or no number in it { percent: null, level: null, stale: false,
//                   staleAt: null } (shown as "STA —"). stale: the record is older than
//                   staleAfterSeconds (shown as "old"); staleAt: when a fresh one turns stale
//           state   "hunting" | "help" | "cleared" | "resting"
//           branch  its own branch only when it differs from its Area's, else null
//   panes   [{ pane, terminal, tab, space, hunter, program, path, branch, focused, frame }], every
//           pane of every space, for the pane headers: hunter is its Hunter (as in areas) or
//           null (a shell, a mod pane); path its own folder for display (PANE_PATH_MAX), null
//           without one; branch its own git branch, null outside git; frame "help" (peach)
//           when its Hunter Needs help, else "focus" (mint) when it has the keyboard, else null
//   state   the next persisted state: { ...state, classes: { [terminal]: "Knight" },
//           monsters: { [spaceId]: { hp, since, slain } } }
//           A Monster record changes only when its Party starts or stops Hunting, is Slain or
//           Respawns: `hp` is its HP at `since` (ms, while wearing) or for good (since null),
//           so the state isn't rewritten on every render, and a restart picks up where it was.

export const MAPS = [
  { id: "forest", name: "Forest", monsters: [{ id: "GiantRacoon", name: "Giant Racoon" }] },
  { id: "desert", name: "Desert", monsters: [{ id: "DemonCyclop", name: "Demon Cyclops" }] },
  { id: "dungeon", name: "Dungeon", monsters: [{ id: "GiantSpirit", name: "Giant Spirit" }] },
  { id: "field", name: "Field", monsters: [{ id: "TenguBlue", name: "Blue Tengu" }] },
  { id: "ruins", name: "Ruins", monsters: [{ id: "GiantRedSamurai", name: "Red Warlord" }] },
  { id: "lakeside", name: "Lakeside", monsters: [{ id: "GiantFrog", name: "Giant Frog" }] },
];

export const CLASSES = [
  { name: "Knight", sprite: "Knight" },
  { name: "Mage", sprite: "SorcererBlack" },
  { name: "Archer", sprite: "Hunter" },
  { name: "Rogue", sprite: "NinjaMasked" },
  { name: "Monk", sprite: "Monk" },
  { name: "Samurai", sprite: "Samurai" },
];

// Hunt states, most urgent first. `color` names a theme color.
export const STATES = {
  help: { label: "Needs help", icon: "!", color: "blocked" },
  hunting: { label: "Hunting", icon: "⚔", color: "working" },
  cleared: { label: "Cleared", icon: "✓", color: "done" },
  resting: { label: "Resting", icon: "z", color: "dim" },
};
export const PRIORITY = ["help", "hunting", "cleared", "resting"];

/** How many Hunters the arena shows; the rest are counted as "+N". */
export const ARENA_MAX = 4;

const FROM_STATUS = { working: "hunting", blocked: "help", done: "cleared", idle: "resting" };

/** Herdr's agent status as a hunt state; null for a pane that isn't an agent. */
export function huntState(status) {
  return FROM_STATUS[status] ?? null;
}

/** The most urgent of some hunt states (Needs help > Hunting > Cleared > Resting), or null. */
export function worstState(states) {
  return PRIORITY.find((s) => states.includes(s)) ?? null;
}

/** The map an Area gets from its position (from 0), cycling through the six. */
export function mapFor(index) {
  return MAPS[((index % MAPS.length) + MAPS.length) % MAPS.length];
}

export const PATH_MAX = 30;

/** A folder for display: home as "~", and a long path cut to "head/…/tail" within `max` chars. */
export function displayPath(path, home, max = PATH_MAX) {
  if (!path) return "~";
  let p = path.length > 1 ? path.replace(/\/+$/, "") : path;
  const h = home ? home.replace(/\/+$/, "") : "";
  if (h && (p === h || p.startsWith(h + "/"))) p = "~" + p.slice(h.length);
  if (p.length <= max) return p;
  const parts = p.split("/");
  const head = parts[0] === "" ? "/" + parts[1] : parts[0];
  const rest = parts.slice(parts[0] === "" ? 2 : 1);
  let tail = rest[rest.length - 1];
  for (let i = rest.length - 2; i >= 0; i--) {
    const next = rest[i] + "/" + tail;
    if ((head + "/…/" + next).length > max) break;
    tail = next;
  }
  const out = head + "/…/" + tail;
  return out.length <= max ? out : "…/" + rest[rest.length - 1];
}

/** The last folder of a path, "~" at home: Herdr's own name for an unnamed space without a repo. */
export function folderName(path, home) {
  const shown = displayPath(path, home, Infinity);
  if (shown === "~") return "~";
  return shown.split("/").filter(Boolean).pop() ?? "~";
}

/** A key like "ctrl-1" as people read it: "⌃1". */
export function keyLabel(key) {
  if (typeof key !== "string" || !key) return null;
  const mods = { ctrl: "⌃", cmd: "⌘", alt: "⌥", shift: "⇧" };
  return key.split("-").map((k) => mods[k] ?? k.toUpperCase()).join("");
}

/** The Hunters the arena shows, most urgent first (stable), and how many are left out. */
export function arenaPick(hunters, max = ARENA_MAX) {
  const rank = (h) => {
    const i = PRIORITY.indexOf(h.state);
    return i < 0 ? PRIORITY.length : i;
  };
  const sorted = hunters.map((h, i) => ({ h, i })).sort((a, b) => rank(a.h) - rank(b.h) || a.i - b.i).map(({ h }) => h);
  return { hunters: sorted.slice(0, max), more: Math.max(0, sorted.length - max) };
}

/** A pane's frame: "help" when its Hunter Needs help, else "focus" when focused, else null.
 *  Peach (help) wins over focus, so urgency never hides behind the keyboard. */
export function paneFrame(state, focused) {
  return state === "help" ? "help" : focused ? "focus" : null;
}

/** The tab bar's view of a space's tabs, in tab order: each tab's first Hunter, worst state and count. */
export function tabsOf(tabs, hunters) {
  return (tabs ?? [])
    .map((t, i) => ({ t, i, index: Number.isFinite(t.index) ? t.index : i + 1 }))
    .sort((a, b) => a.index - b.index || a.i - b.i)
    .map(({ t, index }) => {
      const own = hunters.filter((h) => h.tab === t.id);
      return { id: t.id, index, lead: own[0] ?? null, worst: worstState(own.map((h) => h.state)), hunters: own.length };
    });
}

export const PANE_PATH_MAX = 48;

// Monster HP (cosmetic). While the Party Hunts, HP halves its way toward HP_FLOOR every
// HP_HALF_MS, so it keeps moving on a long hunt but only Slain takes it to 0.
export const HP_MAX = 100;
export const HP_FLOOR = 5;
export const HP_HALF_MS = 4 * 60 * 1000;

/** HP after wearing for `ms` from `hp`. */
export function hpAfter(hp, ms) {
  if (!(hp > HP_FLOOR) || !(ms > 0)) return hp;
  return HP_FLOOR + (hp - HP_FLOOR) * 0.5 ** (ms / HP_HALF_MS);
}

const FRESH = { hp: HP_MAX, since: null, slain: false };

function monsterRecord(r) {
  if (!r || typeof r !== "object") return { ...FRESH };
  const hp = Number.isFinite(r.hp) ? Math.min(HP_MAX, Math.max(0, r.hp)) : HP_MAX;
  return { hp, since: Number.isFinite(r.since) ? r.since : null, slain: r.slain === true };
}

// One Monster's next record from its Party: Slain once nobody Hunts and someone's agent is
// done, a Respawn with full HP when someone Hunts after that, and HP wearing in between.
function monsterStep(old, party, now) {
  const r = monsterRecord(old);
  const hunting = party.some((h) => h.state === "hunting");
  const done = party.some((h) => h.done);
  const hpNow = r.since == null ? r.hp : hpAfter(r.hp, now - r.since);
  if (r.slain) return hunting ? { hp: HP_MAX, since: now, slain: false } : { hp: 0, since: null, slain: true };
  if (!hunting && done) return { hp: 0, since: null, slain: true };
  if (hunting) return r.since == null ? { hp: r.hp, since: now, slain: false } : r;
  return r.since == null ? r : { hp: hpNow, since: null, slain: false };
}

// The panes of a space in tab order, then their own order.
function spacePanes(space, panes) {
  const order = new Map((space.tabs ?? []).map((t, i) => [t.id, Number.isFinite(t.index) ? t.index : i + 1]));
  return panes
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => order.has(p.tab))
    .sort((a, b) => order.get(a.p.tab) - order.get(b.p.tab) || a.i - b.i)
    .map(({ p }) => p);
}

// Gives each new Hunter the Class used least among the living ones, ties by Class order,
// so Classes come in order of first appearance and cycle after six. Known Hunters keep theirs.
function assignClasses(order, old) {
  const known = new Set(CLASSES.map((c) => c.name));
  const classes = {};
  for (const t of order) if (known.has(old[t])) classes[t] = old[t];
  const uses = Object.fromEntries(CLASSES.map((c) => [c.name, 0]));
  for (const name of Object.values(classes)) uses[name]++;
  for (const t of order) {
    if (classes[t]) continue;
    const pick = CLASSES.reduce((best, c) => (uses[c.name] < uses[best.name] ? c : best));
    classes[t] = pick.name;
    uses[pick.name]++;
  }
  return classes;
}

// Rank and Stamina, from the statusLine script's session records. The grade table is data
// (rank.json in the mod folder): the first of its words found in the model's name gives the grade.
export const RANKS = {
  grades: { Fable: "S", Opus: "A", Sonnet: "B", Haiku: "C" },
  staleAfterSeconds: 300,
};
export const STAMINA_HIGH = 50; // this % and up: blue (working)
export const STAMINA_LOW = 20; // below this %: peach (blocked); in between: cream (foreground)

/** The grade table and freshness limit from rank.json's parsed contents, defaults filled in. */
export function rankTable(cfg) {
  const obj = (v) => v && typeof v === "object" && !Array.isArray(v);
  const grades = obj(cfg) && obj(cfg.grades)
    ? Object.fromEntries(Object.entries(cfg.grades)
      .filter(([k, v]) => k.trim() && typeof v === "string" && v.trim())
      .map(([k, v]) => [k.trim(), v.trim()]))
    : RANKS.grades;
  const s = obj(cfg) ? cfg.staleAfterSeconds : undefined;
  return { grades, staleAfterSeconds: Number.isFinite(s) && s > 0 ? s : RANKS.staleAfterSeconds };
}

const words = (text) => text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/** A model's grade from the table (case-insensitive whole words, first entry wins), or "?". */
export function gradeFor(model, grades = RANKS.grades) {
  if (typeof model !== "string" || !model) return "?";
  const have = words(model);
  for (const [key, grade] of Object.entries(grades ?? {})) {
    const want = words(key);
    if (want.length && have.some((_, i) => want.every((w, j) => have[i + j] === w))) return grade;
  }
  return "?";
}

/** The Stamina level of a whole percent: high at 50 and up, mid from 20, low below 20. */
export function staminaLevel(percent) {
  if (!Number.isFinite(percent)) return null;
  return percent >= STAMINA_HIGH ? "high" : percent >= STAMINA_LOW ? "mid" : "low";
}

// A usable session record, or null: from the same app, with a time and a model or a number.
function sessionRecord(r, app) {
  if (!r || typeof r !== "object" || !Number.isFinite(r.at)) return null;
  if (app && typeof r.app === "string" && r.app && r.app !== app) return null;
  const model = typeof r.model === "string" && r.model.trim() ? r.model.trim() : null;
  const left = Number.isFinite(r.left) ? Math.min(100, Math.max(0, r.left)) : null;
  return model || left != null ? { model, left, at: r.at } : null;
}

function rankOf(rec, program, table) {
  const label = rec?.model ?? program;
  const grade = rec?.model ? gradeFor(rec.model, table.grades) : "?";
  return { grade, label, text: `[${grade}] ${label}` };
}

function staminaOf(rec, table, now) {
  if (!rec || rec.left == null) return { percent: null, level: null, stale: false, staleAt: null };
  const percent = Math.round(rec.left);
  const staleAt = rec.at + table.staleAfterSeconds * 1000;
  const stale = now > staleAt;
  return { percent, level: staminaLevel(percent), stale, staleAt: stale ? null : staleAt };
}

function monsterView(r, now) {
  const wearing = r.since != null;
  return {
    hp: wearing ? hpAfter(r.hp, now - r.since) : r.hp,
    mode: r.slain ? "slain" : wearing ? "hit" : "idle",
    wearing,
  };
}

export function hunt({ spaces = [], panes = [], home = "", keys = {}, state = {}, sessions = {}, ranks, now = 0 } = {}) {
  now = Number.isFinite(now) ? now : 0;
  spaces = (spaces ?? []).filter((s) => s && s.id != null);
  panes = (panes ?? []).filter(Boolean);
  keys = keys ?? {};
  sessions = sessions && typeof sessions === "object" ? sessions : {};
  const table = rankTable(ranks);
  state = state && typeof state === "object" ? state : {};
  const perSpace = spaces.map((s) => spacePanes(s, panes));
  const agentsOf = (ps) => ps.filter((p) => p.terminal && huntState(p.status));
  const order = perSpace.flatMap(agentsOf).map((p) => p.terminal);
  const classes = assignClasses(order, state.classes ?? {});
  const byName = Object.fromEntries(CLASSES.map((c) => [c.name, c]));
  const oldMonsters = state.monsters && typeof state.monsters === "object" ? state.monsters : {};
  // Records of closed spaces go, but not while Herdr lists no spaces at all (still starting).
  const monsters = spaces.length ? {} : { ...oldMonsters };
  const paneViews = [];

  const areas = spaces.map((s, index) => {
    const ps = perSpace[index];
    const first = ps.find((p) => p.terminal && p.cwd) ?? null;
    const where = first?.cwd || s.folder || home;
    const branch = (first ? first.branch : s.branch) || null;
    const map = mapFor(index);
    const hunters = agentsOf(ps).map((p) => {
      const program = p.program || "?";
      const rec = sessionRecord(sessions[p.terminal], p.app);
      return {
        terminal: p.terminal,
        pane: p.pane,
        tab: p.tab,
        cls: byName[classes[p.terminal]],
        state: huntState(p.status),
        status: p.status,
        program,
        rank: rankOf(rec, program, table),
        stamina: staminaOf(rec, table, now),
        branch: p.branch && p.branch !== branch ? p.branch : null,
        focused: !!p.focused,
      };
    });
    const byTerminal = new Map(hunters.map((h) => [h.terminal, h]));
    for (const p of ps) {
      const hunter = (p.terminal && byTerminal.get(p.terminal)) || null;
      paneViews.push({
        pane: p.pane ?? null,
        terminal: p.terminal ?? null,
        tab: p.tab,
        space: s.id,
        hunter,
        program: p.program || null,
        path: p.cwd ? displayPath(p.cwd, home, PANE_PATH_MAX) : null,
        branch: p.branch || null,
        focused: !!p.focused,
        frame: paneFrame(hunter?.state, !!p.focused),
      });
    }
    return {
      id: s.id,
      index,
      name: String((s.named ? s.name : s.name || folderName(where, home)) || "~"),
      named: !!s.named,
      current: !!s.active,
      map,
      monster: map.monsters[0],
      worst: worstState(hunters.map((h) => h.state)),
      path: displayPath(where, home),
      branch,
      key: typeof keys[index + 1] === "string" ? keys[index + 1] : null,
      hunters,
      arena: arenaPick(hunters),
      tabs: tabsOf(s.tabs, hunters),
      ...monsterView((monsters[s.id] = monsterStep(oldMonsters[s.id], agentsOf(ps).map((p) => ({
        state: huntState(p.status), done: p.status === "done" || p.report === "done",
      })), now)), now),
    };
  });

  return { areas, panes: paneViews, state: { ...state, classes, monsters } };
}

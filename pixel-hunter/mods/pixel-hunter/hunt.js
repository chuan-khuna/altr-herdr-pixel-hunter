// The hunt model: pure logic, no Herdr imports, so `node --test` runs it as is and every
// role (sidebar, later tabs and pane headers) reads the same world.
//
//   hunt(snapshot) -> { areas, state }
//
// snapshot:
//   spaces  [{ id, name, named, folder, branch, active, tabs: [{ id, index, name, named }] }] in
//           Herdr's order; a tab's name counts for a Class pin only when someone named it
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
//           { app, model, left, used, size, at }: the model's name, the context window left in %
//           (null: not known yet), the context tokens used and the window's size in tokens
//           (missing in records from before ticket 04), written at `at` ms. Bad fields are
//           ignored; nothing is estimated.
//   ranks   optional { grades: { [word]: grade }, staleAfterSeconds } (rank.json); missing or
//           bad parts fall back to RANKS
//   pins    optional { tabs: { [tabName]: className } } (classes.json): every Hunter in a tab with
//           that name has that Class, whatever it had before. Names match trimmed and ignoring
//           case; an unknown Class or a bad entry is ignored. See classPins()
//   now     ms, passed in, never read from a clock here, so HP wear and staleness are deterministic
//   random  optional () => 0..1, defaults to Math.random; used only to pick the Monster of a
//           Respawn, so tests can inject it
//
// Output:
//   areas   [{ id, index, name, named, current, map, monster, worst, path, branch, key, hunters, arena,
//              tabs, hp, mode, wearing, expanded, held }]
//           map     { id: "forest", name: "Forest", monsters: [...] }
//           monster the current Monster, { id: "GiantRacoon", name: "Giant Racoon" } (id: the
//                   pack's sprite folder): the map's own until the Area's first Respawn, then
//                   the one the last Respawn picked (see monsterStep)
//           worst   the worst hunt state in the Party, or null with no Hunters
//           path    the first terminal's folder for display ("~/code/x", shortened when long);
//                   while it has no cwd the space's folder, then home ("~"); never "undefined"
//           branch  the git branch of that folder (the terminal's, or the space's), null
//                   outside git
//           arena   { hunters, more }: up to ARENA_MAX Hunters for the arena, most urgent first
//                   (Needs help, Hunting, Cleared, Resting; ties keep their order), and how
//                   many more there are (shown as "+N")
//           hp      the Monster's HP now, 0..HP_MAX (cosmetic); 0 only when Slain
//           mode    "hit" while anyone in the Party is Hunting, "slain" once nobody is Hunting
//                   and someone's agent is done (Cleared, or seen and Resting with the core
//                   still saying done); it stays Slain until someone Hunts again (Respawn
//                   with full HP); else "idle"
//           wearing true while HP is wearing down (mode "hit"); see hpAfter()
//           expanded whether its Hunters are listed under it (the chevron ▾, else ▸): a choice
//                   made by hand (state.collapsed) wins over the default (open when current,
//                   closed otherwise), but an Area with a Hunter that Needs help always opens
//           held    true while Needs help holds it open, so the chevron can't close it
//           tabs    [{ id, index, lead, worst, hunters }] in tab order, for the tab bar: lead is the
//                   tab's first Hunter in pane order (its face), or null with no agent (a map
//                   icon); worst its most urgent hunt state (the dot), or null; hunters how many
//   hunters [{ terminal, pane, tab, name, cls, state, status, program, programLabel, rank, stamina,
//              tokens, branch, focused }]
//           name    the Hunter's name: its Herdr tab's name, or its Class name when the tab has none
//           cls     { name: "Knight", sprite: "Knight" }
//           programLabel the program's name when it isn't Claude Code ("Codex"), else null (also
//                   with no program known)
//           rank    { grade: "A", label: "Opus 5.5", text: "[A] Opus 5.5" }: grade "?" for a
//                   model the table doesn't know; with no record, "?" and the program's name
//           stamina { percent: 62, level: "high" | "mid" | "low", stale, staleAt }, or with no
//                   record or no number in it { percent: null, level: null, stale: false,
//                   staleAt: null } (shown as "STA —"). stale: the record is older than
//                   staleAfterSeconds (shown as "old"); staleAt: when a fresh one turns stale
//           tokens  { used: 128000, size: 200000, text: "128k/200k" }: context tokens used and the
//                   window's size, as Claude Code reported them; null without both, or while
//                   used is still 0 (no response yet). Never computed from the percentages.
//           state   "hunting" | "help" | "cleared" | "resting"
//           branch  its own branch only when it differs from its Area's, else null
//   panes   [{ pane, terminal, tab, space, hunter, program, path, branch, focused, frame }], every
//           pane of every space, for the pane headers: hunter is its Hunter (as in areas) or
//           null (a shell, a mod pane); path its own folder for display (PANE_PATH_MAX), null
//           without one; branch its own git branch, null outside git; frame "help" (peach)
//           when its Hunter Needs help, else "focus" (mint) when it has the keyboard, else null
//   state   the next persisted state: { ...state, classes: { [terminal]: "Knight" } (pins included),
//           monsters: { [spaceId]: { hp, since, slain, id? } }, collapsed: { [spaceId]: true | false } }
//           collapsed holds only choices made by hand (true: collapsed, false: expanded);
//           toggleArea() makes one. Records of closed spaces go, as for monsters.
//           A Monster record changes only when its Party starts or stops Hunting, is Slain or
//           Respawns: `hp` is its HP at `since` (ms, while wearing) or for good (since null),
//           so the state isn't rewritten on every render, and a restart picks up where it was.
//           `id` is the current Monster, written by a Respawn; without one (old state, or an
//           unknown id) the Area's Monster is its map's own.

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

/** Every Monster, one per map, in map order. */
export const MONSTERS = MAPS.flatMap((m) => m.monsters);
const MONSTER_BY_ID = new Map(MONSTERS.map((m) => [m.id, m]));

/** The Monster a Respawn brings after the one with id `slain`: any of the others, picked with
 *  `random` (() => 0..1). A value outside 0..1 is clamped, so the pick is always one of them. */
export function respawnPick(slain, random = Math.random) {
  const others = MONSTERS.filter((m) => m.id !== slain);
  const r = Number(random());
  const i = Number.isFinite(r) ? Math.floor(r * others.length) : 0;
  return others[Math.min(others.length - 1, Math.max(0, i))];
}

/** The map an Area gets from its position (from 0), cycling through the six. */
export function mapFor(index) {
  return MAPS[((index % MAPS.length) + MAPS.length) % MAPS.length];
}

export const PATH_MAX = 30;

// A path-like value as text: a non-blank string, else "" (Herdr can leave a cwd or folder out).
const text = (v) => (typeof v === "string" && v.trim() ? v : "");

// A Windows path: a drive ("C:\", "C:/", "C:") or a UNC share ("\\server\share"). Such paths, or
// any path when home is one, split on both "\" and "/", match home ignoring case, and keep the
// separator the path itself uses ("C:\Users\me\code" shows as "~\code"). Other paths are POSIX:
// "/" only, case-sensitive, as before.
const WIN_PATH = /^(?:[a-zA-Z]:(?:[\\/]|$)|[\\/]{2}[^\\/])/;

function pathStyle(path, home) {
  const win = WIN_PATH.test(path) || WIN_PATH.test(home || "");
  if (!win) return { win, sep: "/", split: "/" };
  return { win, sep: path.match(/[\\/]/)?.[0] ?? "\\", split: /[\\/]/ };
}

/** A folder for display: home as "~", and a long path cut to "head/…/tail" within `max` chars. */
export function displayPath(path, home, max = PATH_MAX) {
  path = text(path);
  home = text(home);
  if (!path) return "~";
  const { win, sep, split } = pathStyle(path, home);
  let p, h;
  if (win) {
    p = path.replace(/[\\/]+$/, "");
    if (/^[a-zA-Z]:$/.test(p)) p += sep; // a drive root keeps its separator: "C:\"
    h = home ? home.replace(/[\\/]+$/, "") : "";
  } else {
    p = path.length > 1 ? path.replace(/\/+$/, "") : path;
    h = home ? home.replace(/\/+$/, "") : "";
  }
  const key = win ? (s) => s.replace(/\\/g, "/").toLowerCase() : (s) => s;
  if (h && (key(p) === key(h) || key(p).startsWith(key(h) + "/"))) p = "~" + p.slice(h.length);
  if (p.length <= max) return p;
  const parts = p.split(split);
  let head, rest;
  if (win && parts[0] === "" && parts[1] === "") {
    if (parts.length < 5) return p; // only "\\server\share": nothing after it to cut
    head = sep + sep + parts[2] + sep + parts[3]; // UNC: "\\server\share"
    rest = parts.slice(4);
  } else {
    head = parts[0] === "" ? sep + parts[1] : parts[0];
    rest = parts.slice(parts[0] === "" ? 2 : 1);
  }
  if (rest.length === 0) return p; // nothing after the root to cut
  let tail = rest[rest.length - 1];
  for (let i = rest.length - 2; i >= 0; i--) {
    const next = rest[i] + sep + tail;
    if ((head + sep + "…" + sep + next).length > max) break;
    tail = next;
  }
  const out = head + sep + "…" + sep + tail;
  return out.length <= max ? out : "…" + sep + rest[rest.length - 1];
}

/** The last folder of a path, "~" at home: Herdr's own name for an unnamed space without a repo. */
export function folderName(path, home) {
  const shown = displayPath(path, home, Infinity);
  if (shown === "~") return "~";
  const { win, split } = pathStyle(text(path), text(home));
  if (win && /^[a-zA-Z]:[\\/]$/.test(shown)) return shown; // a drive root: "C:\"
  return shown.split(split).filter(Boolean).pop() ?? "~";
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

// A saved record, cleaned. `id` stays only when it names a known Monster.
function monsterRecord(r) {
  if (!r || typeof r !== "object") return { ...FRESH };
  const hp = Number.isFinite(r.hp) ? Math.min(HP_MAX, Math.max(0, r.hp)) : HP_MAX;
  const out = { hp, since: Number.isFinite(r.since) ? r.since : null, slain: r.slain === true };
  if (MONSTER_BY_ID.has(r.id)) out.id = r.id;
  return out;
}

// One Monster's next record from its Party: Slain once nobody Hunts and someone's agent is
// done, a Respawn with full HP when someone Hunts after that, and HP wearing in between.
// A Respawn brings a different Monster (respawnPick, from the Slain one: `id`, else `own`, the
// map's own) and writes it as `id`; every other step keeps the id it had, or none.
function monsterStep(old, party, now, own, random) {
  const r = monsterRecord(old);
  const keep = (rec) => (r.id ? { ...rec, id: r.id } : rec);
  const hunting = party.some((h) => h.state === "hunting");
  const done = party.some((h) => h.done);
  const hpNow = r.since == null ? r.hp : hpAfter(r.hp, now - r.since);
  if (r.slain) {
    if (!hunting) return keep({ hp: 0, since: null, slain: true });
    return { hp: HP_MAX, since: now, slain: false, id: respawnPick(r.id ?? own, random).id };
  }
  if (!hunting && done) return keep({ hp: 0, since: null, slain: true });
  if (hunting) return r.since == null ? keep({ hp: r.hp, since: now, slain: false }) : r;
  return r.since == null ? r : keep({ hp: hpNow, since: null, slain: false });
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

/** The Class pins from classes.json's parsed contents: a Map of lower-cased tab name to Class
 *  name. A tab name is trimmed and matched ignoring case, a Class name too ("mage" is Mage);
 *  an empty name, an unknown Class or a broken file pins nothing. */
export function classPins(cfg) {
  const obj = (v) => v && typeof v === "object" && !Array.isArray(v);
  const pins = new Map();
  if (!obj(cfg) || !obj(cfg.tabs)) return pins;
  const byLower = new Map(CLASSES.map((c) => [c.name.toLowerCase(), c.name]));
  for (const [tab, cls] of Object.entries(cfg.tabs)) {
    const key = tab.trim().toLowerCase();
    const name = typeof cls === "string" ? byLower.get(cls.trim().toLowerCase()) : undefined;
    if (key && name && !pins.has(key)) pins.set(key, name);
  }
  return pins;
}

// Gives each new Hunter the Class used least among the living ones, ties by Class order,
// so Classes come in order of first appearance and cycle after six. Known Hunters keep theirs.
// A pinned Hunter (`pinned`: { [terminal]: Class }) always has its pin, and the pin counts as
// a use, so the others still spread over the Classes left.
function assignClasses(order, old, pinned = {}) {
  const known = new Set(CLASSES.map((c) => c.name));
  const classes = {};
  for (const t of order) {
    if (known.has(pinned[t])) classes[t] = pinned[t];
    else if (known.has(old[t])) classes[t] = old[t];
  }
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
  const count = (v) => (Number.isFinite(v) && v >= 0 ? Math.round(v) : null);
  const used = count(r.used);
  const size = count(r.size) || null;
  return model || left != null || (used != null && size != null) ? { model, left, used, size, at: r.at } : null;
}

/** A token count as people read it: "950", "128k", "1M", "1.5M" (k and M in thousands). */
export function tokenText(n) {
  if (!Number.isFinite(n) || n < 0) return "";
  const k = Math.round(n / 1000);
  if (k >= 1000) return `${Math.round(n / 100000) / 10}M`;
  return n < 1000 ? String(Math.round(n)) : `${k}k`;
}

// Context tokens used / window size, from the record; null without both or before the first
// response (used 0).
function tokensOf(rec) {
  if (!rec || !(rec.used > 0) || !(rec.size > 0)) return null;
  return { used: rec.used, size: rec.size, text: `${tokenText(rec.used)}/${tokenText(rec.size)}` };
}

/** The program's name to show beside the Class: null for Claude Code (the usual one) and
 *  for no program at all, else the name as Herdr gives it ("Codex"). */
export function programLabel(program, app) {
  if (app === "claude-code") return null;
  const name = typeof program === "string" ? program.trim() : "";
  if (!name || name === "?") return null;
  return /^claude([\s_-]*code)?$/i.test(name) ? null : name;
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

// An Area's expansion: Needs help always opens it; else a choice by hand (true: collapsed,
// false: expanded) wins over the default, which opens only the current Area.
export function areaExpanded({ current, help, collapsed }) {
  if (help) return true;
  if (typeof collapsed === "boolean") return !collapsed;
  return !!current;
}

/** The next persisted state after the chevron of `area` (an output Area) is clicked: the
 *  opposite of what it shows now, remembered for that space. While Needs help holds it open
 *  nothing changes (the click would show nothing, and a close later would surprise). */
export function toggleArea(state, area) {
  state = state && typeof state === "object" ? state : {};
  if (!area || area.id == null || area.held) return state;
  const collapsed = state.collapsed && typeof state.collapsed === "object" ? state.collapsed : {};
  return { ...state, collapsed: { ...collapsed, [area.id]: !!area.expanded } };
}

function monsterView(r, now) {
  const wearing = r.since != null;
  return {
    hp: wearing ? hpAfter(r.hp, now - r.since) : r.hp,
    mode: r.slain ? "slain" : wearing ? "hit" : "idle",
    wearing,
  };
}

export function hunt({ spaces = [], panes = [], home = "", keys = {}, state = {}, sessions = {}, ranks, pins, now = 0, random = Math.random } = {}) {
  now = Number.isFinite(now) ? now : 0;
  random = typeof random === "function" ? random : Math.random;
  spaces = (spaces ?? []).filter((s) => s && s.id != null);
  panes = (panes ?? []).filter(Boolean);
  keys = keys ?? {};
  sessions = sessions && typeof sessions === "object" ? sessions : {};
  const table = rankTable(ranks);
  state = state && typeof state === "object" ? state : {};
  const perSpace = spaces.map((s) => spacePanes(s, panes));
  const agentsOf = (ps) => ps.filter((p) => p.terminal && huntState(p.status));
  const order = perSpace.flatMap(agentsOf).map((p) => p.terminal);
  const pinOf = classPins(pins);
  const pinned = {};
  spaces.forEach((s, i) => {
    const tabNames = new Map((s.tabs ?? []).filter((t) => t && t.named && typeof t.name === "string")
      .map((t) => [t.id, t.name.trim().toLowerCase()]));
    for (const p of agentsOf(perSpace[i])) {
      const pin = pinOf.get(tabNames.get(p.tab));
      if (pin) pinned[p.terminal] = pin;
    }
  });
  const oldClasses = state.classes && typeof state.classes === "object" ? state.classes : {};
  const classes = assignClasses(order, oldClasses, pinned);
  const byName = Object.fromEntries(CLASSES.map((c) => [c.name, c]));
  const oldMonsters = state.monsters && typeof state.monsters === "object" ? state.monsters : {};
  // Records of closed spaces go, but not while Herdr lists no spaces at all (still starting).
  const monsters = spaces.length ? {} : { ...oldMonsters };
  const oldCollapsed = state.collapsed && typeof state.collapsed === "object" ? state.collapsed : {};
  const collapsed = spaces.length ? {} : { ...oldCollapsed };
  const paneViews = [];

  const areas = spaces.map((s, index) => {
    const ps = perSpace[index];
    // The first terminal's folder and branch; while it has no cwd (just opened), the space's.
    const first = ps.find((p) => p.terminal) ?? null;
    const cwd = text(first?.cwd);
    const where = cwd || text(s.folder) || text(home);
    const branch = text(cwd ? first.branch : s.branch) || null;
    const map = mapFor(index);
    const tabName = new Map((s.tabs ?? []).filter(Boolean).map((t) => [t.id, text(t.name).trim()]));
    const hunters = agentsOf(ps).map((p) => {
      const program = p.program || "?";
      const rec = sessionRecord(sessions[p.terminal], p.app);
      const cls = byName[classes[p.terminal]];
      return {
        terminal: p.terminal,
        pane: p.pane,
        tab: p.tab,
        name: tabName.get(p.tab) || cls.name,
        cls,
        state: huntState(p.status),
        status: p.status,
        program,
        programLabel: programLabel(p.program, p.app),
        rank: rankOf(rec, program, table),
        stamina: staminaOf(rec, table, now),
        tokens: tokensOf(rec),
        branch: p.branch && p.branch !== branch ? p.branch : null,
        focused: !!p.focused,
      };
    });
    const byTerminal = new Map(hunters.map((h) => [h.terminal, h]));
    const help = hunters.some((h) => h.state === "help");
    if (typeof oldCollapsed[s.id] === "boolean") collapsed[s.id] = oldCollapsed[s.id];
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
      worst: worstState(hunters.map((h) => h.state)),
      path: displayPath(where, home),
      branch,
      key: typeof keys[index + 1] === "string" ? keys[index + 1] : null,
      hunters,
      arena: arenaPick(hunters),
      tabs: tabsOf(s.tabs, hunters),
      expanded: areaExpanded({ current: !!s.active, help, collapsed: collapsed[s.id] }),
      held: help,
      ...monsterView((monsters[s.id] = monsterStep(oldMonsters[s.id], agentsOf(ps).map((p) => ({
        state: huntState(p.status), done: p.status === "done" || p.report === "done",
      })), now, map.monsters[0].id, random)), now),
      monster: MONSTER_BY_ID.get(monsters[s.id].id) ?? map.monsters[0],
    };
  });

  return { areas, panes: paneViews, state: { ...state, classes, monsters, collapsed } };
}

// The hunt model, snapshot in and view model out. Run: node --test mods/pixel-hunter/test/
import { test } from "node:test";
import assert from "node:assert/strict";
import { hunt, displayPath, keyLabel, hpAfter, HP_MAX, HP_FLOOR, HP_HALF_MS, gradeFor, staminaLevel, rankTable, RANKS } from "../hunt.js";
import { readFileSync } from "node:fs";

const HOME = "/Users/me";
let n = 0;
const space = (over = {}) => {
  const id = over.id ?? `s${++n}`;
  return { id, name: id, named: false, folder: "", branch: null, active: false, tabs: [{ id: `${id}-t1`, index: 1 }], ...over };
};
const agent = (s, terminal, over = {}) => ({
  pane: `p-${terminal}`, terminal, tab: s.tabs[0].id, status: "idle", program: "Claude Code",
  cwd: `${HOME}/code/${s.id}`, branch: "main", focused: false, ...over,
});
const shell = (s, over = {}) => ({ ...agent(s, `sh-${s.id}`, over), status: null, program: "zsh", ...over });

test("spaces take maps in order and cycle past six, each with its Monster", () => {
  const spaces = Array.from({ length: 8 }, () => space());
  const { areas } = hunt({ spaces, home: HOME });
  assert.deepEqual(areas.map((a) => a.map.name),
    ["Forest", "Desert", "Dungeon", "Field", "Ruins", "Lakeside", "Forest", "Desert"]);
  assert.deepEqual(areas.slice(0, 6).map((a) => a.monster.name),
    ["Giant Racoon", "Demon Cyclops", "Giant Spirit", "Blue Tengu", "Red Warlord", "Giant Frog"]);
  assert.equal(areas[6].monster.id, "GiantRacoon");
});

test("the name is Herdr's unless renamed; with no name it falls back to the folder, then ~", () => {
  const a = space({ name: "shop-api" });
  const b = space({ name: "Login fix", named: true });
  const c = space({ name: "" });
  const d = space({ name: "" });
  const panes = [shell(a), shell(b), shell(c, { cwd: `${HOME}/code/auth-service` }), shell(d, { cwd: HOME })];
  const { areas } = hunt({ spaces: [a, b, c, d], panes, home: HOME });
  assert.deepEqual(areas.map((x) => x.name), ["shop-api", "Login fix", "auth-service", "~"]);
  assert.equal(areas[1].named, true);
});

test("path shows ~ for home, is shortened when long, and has no branch outside git", () => {
  assert.equal(displayPath(HOME, HOME), "~");
  assert.equal(displayPath(`${HOME}/code/shop-api`, HOME), "~/code/shop-api");
  assert.equal(displayPath("/opt/tools", HOME), "/opt/tools");
  const long = displayPath(`${HOME}/Documents/code/personal/herdr-monster-hunter`, HOME);
  assert.equal(long, "~/…/herdr-monster-hunter");
  assert.ok(long.length <= 30);
  assert.equal(displayPath(`${HOME}/code/one/two/three/four`, HOME, 20), "~/…/two/three/four");
  assert.equal(displayPath(`${HOME}/a/a-really-long-folder-name-that-never-fits-here`, HOME),
    "…/a-really-long-folder-name-that-never-fits-here");

  const s = space();
  const { areas } = hunt({ spaces: [s], panes: [shell(s, { cwd: "/tmp/scratch", branch: null })], home: HOME });
  assert.equal(areas[0].path, "/tmp/scratch");
  assert.equal(areas[0].branch, null);

  const e = space({ folder: "" });
  assert.equal(hunt({ spaces: [e], home: HOME }).areas[0].path, "~");
});

test("the Area path and branch come from its first terminal, in tab order", () => {
  const s = space({ tabs: [{ id: "late", index: 2 }, { id: "early", index: 1 }] });
  const panes = [
    shell(s, { pane: "p2", terminal: "t2", tab: "late", cwd: `${HOME}/b`, branch: "feat/b" }),
    shell(s, { pane: "p1", terminal: "t1", tab: "early", cwd: `${HOME}/a`, branch: "feat/a" }),
  ];
  const [area] = hunt({ spaces: [s], panes, home: HOME }).areas;
  assert.equal(area.path, "~/a");
  assert.equal(area.branch, "feat/a");
});

test("Classes go in order of first appearance across the workspace and cycle after six", () => {
  const a = space(), b = space();
  const panes = [
    agent(a, "a1"), agent(a, "a2"), agent(a, "a3"), agent(a, "a4"),
    agent(b, "b1"), agent(b, "b2"), agent(b, "b3"), agent(b, "b4"),
  ];
  const { areas } = hunt({ spaces: [a, b], panes, home: HOME });
  assert.deepEqual(areas.flatMap((x) => x.hunters.map((h) => h.cls.name)),
    ["Knight", "Mage", "Archer", "Rogue", "Monk", "Samurai", "Knight", "Mage"]);
  assert.equal(areas[0].hunters[1].cls.sprite, "SorcererBlack");
});

test("a Hunter keeps its Class while it lives; a gone Hunter frees its Class", () => {
  const a = space();
  const first = hunt({ spaces: [a], panes: [agent(a, "t1"), agent(a, "t2"), agent(a, "t3")], home: HOME });
  assert.deepEqual(first.state.classes, { t1: "Knight", t2: "Mage", t3: "Archer" });

  // t1 closes, a new one opens in front of the others: the others keep theirs,
  // the newcomer takes the free Knight.
  const next = hunt({ spaces: [a], panes: [agent(a, "t9"), agent(a, "t2"), agent(a, "t3")], home: HOME, state: first.state });
  assert.deepEqual(next.areas[0].hunters.map((h) => [h.terminal, h.cls.name]),
    [["t9", "Knight"], ["t2", "Mage"], ["t3", "Archer"]]);
  assert.equal(next.state.classes.t1, undefined);
});

test("persisted state keeps fields it doesn't own", () => {
  const a = space();
  const { state } = hunt({ spaces: [a], panes: [agent(a, "t1")], home: HOME, state: { hp: { x: 1 } } });
  assert.deepEqual(state.hp, { x: 1 });
});

test("agent status maps to hunt states, and the Area dot is the worst one", () => {
  const a = space();
  const panes = ["working", "blocked", "done", "idle"].map((status, i) => agent(a, `t${i}`, { status }));
  const [area] = hunt({ spaces: [a], panes, home: HOME }).areas;
  assert.deepEqual(area.hunters.map((h) => h.state), ["hunting", "help", "cleared", "resting"]);
  assert.equal(area.worst, "help");

  const worst = (statuses) => hunt({ spaces: [a], panes: statuses.map((status, i) => agent(a, `w${i}`, { status })), home: HOME }).areas[0].worst;
  assert.equal(worst(["idle", "done", "working"]), "hunting");
  assert.equal(worst(["idle", "done"]), "cleared");
  assert.equal(worst(["idle"]), "resting");
});

test("an Area with no Hunters has no Party and no worst state, but keeps its Monster", () => {
  const a = space();
  const [area] = hunt({ spaces: [a], panes: [shell(a)], home: HOME }).areas;
  assert.deepEqual(area.hunters, []);
  assert.equal(area.worst, null);
  assert.equal(area.monster.name, "Giant Racoon");
});

test("a Hunter shows its own branch only when it differs from its Area's", () => {
  const a = space();
  const panes = [
    shell(a, { branch: "feat/login" }),
    agent(a, "same", { branch: "feat/login" }),
    agent(a, "other", { branch: "fix/cart" }),
    agent(a, "none", { branch: null }),
  ];
  const [area] = hunt({ spaces: [a], panes, home: HOME }).areas;
  assert.equal(area.branch, "feat/login");
  assert.deepEqual(area.hunters.map((h) => h.branch), [null, "fix/cart", null]);
});

test("Hunters show their program, and the Area its shortcut", () => {
  const a = space();
  const [area] = hunt({ spaces: [a], panes: [agent(a, "t1", { program: "codex" })], home: HOME, keys: { 1: "⌃1" } }).areas;
  assert.equal(area.hunters[0].program, "codex");
  assert.equal(area.key, "⌃1");
  assert.equal(keyLabel("ctrl-1"), "⌃1");
  assert.equal(keyLabel("cmd-shift-2"), "⌘⇧2");
});

test("sparse input (no tabs, no terminals, missing fields) still gives a complete view model", () => {
  const { areas, state } = hunt({
    spaces: [{ id: "a" }, { id: "b", name: null, tabs: [{ id: "t" }] }, null],
    panes: [null, { pane: "p", terminal: "x", tab: "t", status: "working" }],
    keys: null, state: null,
  });
  assert.equal(areas.length, 2);
  for (const a of areas) {
    assert.ok(Number.isInteger(a.index));
    assert.equal(typeof a.name, "string");
    assert.equal(typeof a.path, "string");
    assert.equal(a.key, null);
    assert.ok(Array.isArray(a.hunters));
  }
  assert.equal(areas[0].name, "~");
  assert.equal(areas[1].hunters[0].program, "?");
  assert.deepEqual(state.classes, { x: "Knight" });
  assert.equal(hunt().areas.length, 0);
});

test("the arena shows at most four Hunters, most urgent first, and +N for the rest", () => {
  const a = space();
  const statuses = ["idle", "done", "working", "idle", "blocked", "working", "done"];
  const panes = statuses.map((status, i) => agent(a, `a${i}`, { status }));
  const [area] = hunt({ spaces: [a], panes, home: HOME }).areas;
  // Needs help, then Hunting (in tab order), then Cleared; Resting and one Cleared are left out
  assert.deepEqual(area.arena.hunters.map((h) => h.terminal), ["a4", "a2", "a5", "a1"]);
  assert.equal(area.arena.more, 3);
  assert.equal(area.hunters.length, 7, "the Area list still shows every Hunter");

  const few = hunt({ spaces: [a], panes: panes.slice(0, 2), home: HOME }).areas[0].arena;
  assert.deepEqual(few.hunters.map((h) => h.state), ["cleared", "resting"]);
  assert.equal(few.more, 0);

  const none = hunt({ spaces: [a], panes: [shell(a)], home: HOME }).areas[0].arena;
  assert.deepEqual(none, { hunters: [], more: 0 });
});

test("each space has its own arena map and Monster", () => {
  const spaces = [space({ active: false }), space({ active: true })];
  const { areas } = hunt({ spaces, home: HOME });
  const current = areas.find((x) => x.current);
  assert.equal(current.map.id, "desert");
  assert.equal(current.monster.name, "Demon Cyclops");
});

// Monster HP, Slain and Respawn. Time is injected: each step passes the last state and a `now`.
const MIN = 60 * 1000;
function hunting(statuses) {
  const a = space({ id: "hp" });
  let state = {};
  return {
    step(now, list = statuses) {
      const out = hunt({ spaces: [a], panes: list.map((status, i) => agent(a, `h${i}`, { status })), home: HOME, state, now });
      state = out.state;
      return out.areas[0];
    },
    get state() { return state; },
  };
}

test("a fresh Monster has full HP and idles until its Party Hunts", () => {
  const h = hunting(["idle"]);
  const area = h.step(0);
  assert.equal(area.hp, HP_MAX);
  assert.equal(area.mode, "idle");
  assert.equal(area.wearing, false);
  assert.equal(hunt({ spaces: [space()], home: HOME }).areas[0].hp, HP_MAX, "an Area with no Hunters too");
});

test("HP wears down while anyone is Hunting, with injected time, and holds when they stop", () => {
  const h = hunting(["working"]);
  const start = h.step(1000);
  assert.equal(start.mode, "hit");
  assert.equal(start.hp, HP_MAX);
  assert.equal(start.wearing, true);
  const half = h.step(1000 + HP_HALF_MS);
  assert.equal(half.hp, HP_FLOOR + (HP_MAX - HP_FLOOR) / 2);
  assert.ok(h.step(1000 + 3 * HP_HALF_MS).hp < half.hp);
  const long = h.step(1000 + 100 * HP_HALF_MS).hp;
  assert.ok(long >= HP_FLOOR && long > 0, "Hunting alone never takes HP to 0");

  // Needs help and Resting stop the wear (nobody is Hunting, nobody is Cleared): HP holds
  const g = hunting(["working"]);
  g.step(0);
  const paused = g.step(5 * MIN, ["blocked", "idle"]);
  assert.equal(paused.mode, "idle");
  assert.equal(paused.wearing, false);
  assert.equal(g.step(50 * MIN, ["blocked", "idle"]).hp, paused.hp);
  assert.equal(paused.hp, hpAfter(HP_MAX, 5 * MIN));
  // and wearing goes on from there when someone Hunts again
  g.step(60 * MIN, ["working", "idle"]);
  assert.equal(g.step(61 * MIN, ["working", "idle"]).hp, hpAfter(paused.hp, MIN));
});

test("the state is rewritten only when the hunt changes, not on every render", () => {
  const h = hunting(["working"]);
  h.step(0);
  const before = JSON.stringify(h.state);
  h.step(MIN);
  h.step(2 * MIN);
  assert.equal(JSON.stringify(h.state), before);
});

test("Slain only when nobody is Hunting and someone is Cleared; a mixed Party keeps it alive", () => {
  const h = hunting(["working", "working"]);
  h.step(0);
  const mixed = h.step(MIN, ["done", "working"]);
  assert.equal(mixed.mode, "hit", "one Cleared, one Hunting: the Monster is still fighting");
  assert.ok(mixed.hp > 0);
  const help = hunting(["blocked", "idle"]).step(0);
  assert.equal(help.mode, "idle", "nobody Cleared: not Slain");

  const slain = h.step(2 * MIN, ["done", "idle"]);
  assert.equal(slain.mode, "slain");
  assert.equal(slain.hp, 0);
  assert.equal(slain.wearing, false);
  // looking at a Cleared agent turns it idle in Herdr: the Monster stays Slain
  assert.equal(h.step(3 * MIN, ["idle", "idle"]).mode, "slain");
  assert.equal(h.step(30 * MIN, ["idle", "blocked"]).hp, 0);
});

test("a hunt finished while watched (Herdr shows Resting, the core still says done) slays the Monster", () => {
  const a = space();
  const run = (report, state) => hunt({ spaces: [a], panes: [agent(a, "w", { status: "idle", report })], home: HOME, state, now: MIN });
  const watched = run("done", {}).areas[0];
  assert.equal(watched.hunters[0].state, "resting", "the Hunter's label follows Herdr");
  assert.equal(watched.mode, "slain");
  assert.equal(run("idle", {}).areas[0].mode, "idle", "an agent that never finished doesn't slay it");
  const busy = hunt({ spaces: [a], panes: [agent(a, "w", { status: "idle", report: "done" }), agent(a, "x", { status: "working" })], home: HOME, now: 0 });
  assert.equal(busy.areas[0].mode, "hit", "someone still Hunting keeps it alive");
});

test("a Hunter starting to Hunt after a Slain brings a fresh Monster with full HP", () => {
  const h = hunting(["done"]);
  assert.equal(h.step(0).mode, "slain");
  const back = h.step(MIN, ["working"]);
  assert.equal(back.mode, "hit");
  assert.equal(back.hp, HP_MAX);
  assert.ok(h.step(MIN + HP_HALF_MS, ["working"]).hp < HP_MAX, "and the new one wears down");
});

test("HP and Slain survive a restart: a new run with the saved state picks up where it was", () => {
  const a = space({ id: "a" }), b = space({ id: "b" });
  const panes = [agent(a, "a1", { status: "working" }), agent(b, "b1", { status: "done" })];
  const first = hunt({ spaces: [a, b], panes, home: HOME, state: {}, now: 0 });
  const saved = JSON.parse(JSON.stringify(first.state)); // as shared state stores it
  // Herdr restarts: no spaces yet on the first render, then the same ones
  const empty = hunt({ spaces: [], panes: [], home: HOME, state: saved, now: 2 * MIN });
  assert.deepEqual(empty.state.monsters, saved.monsters, "nothing is lost while Herdr is starting");
  const after = hunt({ spaces: [a, b], panes, home: HOME, state: empty.state, now: 2 * MIN }).areas;
  assert.equal(after[0].mode, "hit");
  assert.equal(after[0].hp, hpAfter(HP_MAX, 2 * MIN));
  assert.equal(after[1].mode, "slain");
  assert.equal(after[1].hp, 0);
});

test("a closed space's Monster is dropped; bad saved records start fresh", () => {
  const a = space({ id: "keep" });
  const { state, areas } = hunt({
    spaces: [a], home: HOME, now: 0,
    state: { monsters: { keep: { hp: "x", since: "y", slain: 1 }, gone: { hp: 3, since: null, slain: false } } },
  });
  assert.deepEqual(Object.keys(state.monsters), ["keep"]);
  assert.equal(areas[0].hp, HP_MAX);
  assert.equal(areas[0].mode, "idle");
});

// Rank and Stamina, from the statusLine script's session records.
const rec = (over = {}) => ({ v: 1, app: "claude-code", model: "Opus 5.5", left: 62, at: 0, ...over });
const hunters = (sessions, { now = 0, ranks, panes } = {}) => {
  const a = space({ id: "rk" });
  panes = panes ?? Object.keys(sessions).map((t) => agent(a, t, { app: "claude-code" }));
  return hunt({ spaces: [a], panes, home: HOME, sessions, ranks, now }).areas[0].hunters;
};

test("Rank is the model with its grade from the table: Fable S, Opus A, Sonnet B, Haiku C", () => {
  const hs = hunters({
    f: rec({ model: "Fable 5.1" }), o: rec({ model: "Opus 5.5" }), s: rec({ model: "Sonnet 5.5" }),
    h: rec({ model: "Haiku 5.5" }), id: rec({ model: "claude-sonnet-5-5" }),
  });
  assert.deepEqual(hs.map((h) => h.rank.text), ["[S] Fable 5.1", "[A] Opus 5.5", "[B] Sonnet 5.5", "[C] Haiku 5.5", "[B] claude-sonnet-5-5"]);
  assert.deepEqual(hs[1].rank, { grade: "A", label: "Opus 5.5", text: "[A] Opus 5.5" });
  assert.equal(gradeFor("OPUS"), "A", "case doesn't matter");
  assert.equal(gradeFor("Magnum Opusculum"), "?", "whole words only");
});

test("an unknown model is graded ?, and with no record a Hunter shows ? with its program", () => {
  const a = space({ id: "unk" });
  const panes = [
    agent(a, "m", { app: "claude-code" }),
    agent(a, "c", { program: "codex", app: "codex" }),
    agent(a, "x", { program: "" }),
  ];
  const hs = hunt({ spaces: [a], panes, home: HOME, sessions: { m: rec({ model: "Mythos 1" }) } }).areas[0].hunters;
  assert.deepEqual(hs.map((h) => h.rank.text), ["[?] Mythos 1", "[?] codex", "[?] ?"]);
  assert.equal(gradeFor(null), "?");
  assert.equal(gradeFor(""), "?");
});

test("the grade table is data: another table changes the grade, no code involved", () => {
  const sessions = { o: rec({ model: "Opus 5.5" }), n: rec({ model: "Mythos 1" }) };
  const ranks = { grades: { Mythos: "S", Opus: "B" } };
  assert.deepEqual(hunters(sessions, { ranks }).map((h) => h.rank.grade), ["B", "S"]);
  // the shipped rank.json is the default table
  const shipped = JSON.parse(readFileSync(new URL("../rank.json", import.meta.url), "utf8"));
  assert.deepEqual(rankTable(shipped), RANKS);
  assert.deepEqual(hunters(sessions, { ranks: shipped }).map((h) => h.rank.grade), ["A", "?"]);
  // first entry wins when two words match
  assert.equal(gradeFor("Opus Fable", { Fable: "S", Opus: "A" }), "S");
  // a broken table falls back to the defaults instead of breaking the sidebar
  for (const bad of [null, "x", [], { grades: [] }, { grades: "S" }]) assert.deepEqual(rankTable(bad).grades, RANKS.grades);
  assert.deepEqual(rankTable({ grades: { Opus: 5, "": "S", Fable: " S " } }).grades, { Fable: "S" });
});

test("Stamina is blue from 50%, cream from 20% to 50%, peach below 20%", () => {
  const lefts = [100, 50, 49.6, 49.4, 20, 19.6, 19.4, 0];
  const sessions = Object.fromEntries(lefts.map((left, i) => [`l${i}`, rec({ left })]));
  const hs = hunters(sessions);
  assert.deepEqual(hs.map((h) => h.stamina.percent), [100, 50, 50, 49, 20, 20, 19, 0]);
  assert.deepEqual(hs.map((h) => h.stamina.level), ["high", "high", "high", "mid", "mid", "mid", "low", "low"]);
  assert.equal(staminaLevel(50), "high");
  assert.equal(staminaLevel(20), "mid");
  assert.equal(staminaLevel(19), "low");
  assert.equal(staminaLevel(null), null);
});

test("no record, or no number in it, shows — and is never estimated", () => {
  const a = space({ id: "none" });
  const panes = [agent(a, "n"), agent(a, "z", { app: "claude-code" }), agent(a, "b"), agent(a, "o", { app: "codex" })];
  const sessions = {
    z: rec({ left: null }),
    b: { model: "Opus 5.5", left: "62", at: "yesterday" },
    o: rec(), // an old Claude Code record in a terminal now running codex
  };
  const hs = hunt({ spaces: [a], panes, home: HOME, sessions, now: 0 }).areas[0].hunters;
  const none = { percent: null, level: null, stale: false, staleAt: null };
  for (const h of hs) assert.deepEqual(h.stamina, none, h.terminal);
  assert.equal(hs[1].rank.text, "[A] Opus 5.5", "the model still shows without a number");
  assert.equal(hs[2].rank.text, "[?] Claude Code", "a record without a time isn't used");
  assert.equal(hs[3].rank.text, "[?] Claude Code", "a record from another app isn't used");
  const empty = hunt({ spaces: [a], panes, home: HOME }).areas[0].hunters;
  assert.ok(empty.every((h) => h.rank.text === `[?] ${h.program}` && h.stamina.percent === null), "without the script: program and —");
});

test("a record older than the freshness limit is marked stale, with when it turns stale", () => {
  const LIMIT = RANKS.staleAfterSeconds * 1000;
  const sessions = { s: rec({ at: 1000, left: 15 }) };
  const fresh = hunters(sessions, { now: 1000 + LIMIT })[0].stamina;
  assert.deepEqual(fresh, { percent: 15, level: "low", stale: false, staleAt: 1000 + LIMIT });
  const old = hunters(sessions, { now: 1001 + LIMIT })[0].stamina;
  assert.deepEqual(old, { percent: 15, level: "low", stale: true, staleAt: null }, "the number stays, marked old");
  const custom = hunters(sessions, { now: 1000 + 11_000, ranks: { staleAfterSeconds: 10 } })[0].stamina;
  assert.equal(custom.stale, true, "the limit comes from the table");
  assert.equal(rankTable({ staleAfterSeconds: -1 }).staleAfterSeconds, RANKS.staleAfterSeconds);
});

// The hunt model, snapshot in and view model out. Run: node --test mods/pixel-hunter/test/
import { test } from "node:test";
import assert from "node:assert/strict";
import { hunt, displayPath, keyLabel } from "../hunt.js";

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

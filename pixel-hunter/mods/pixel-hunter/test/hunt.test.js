// The hunt model, snapshot in and view model out. Run: node --test mods/pixel-hunter/test/
import { test } from "node:test";
import assert from "node:assert/strict";
import { hunt, displayPath, folderName, keyLabel, hpAfter, HP_MAX, HP_FLOOR, HP_HALF_MS, gradeFor, staminaLevel, rankTable, RANKS, paneFrame, toggleArea, classPins, MONSTERS } from "../hunt.js";
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

test("Windows paths: either separator, drive letters, UNC shares, home matched ignoring case", () => {
  const WIN = "C:\\Users\\chuan";
  assert.equal(displayPath(WIN, WIN), "~");
  assert.equal(displayPath("c:\\users\\Chuan\\", WIN), "~");
  assert.equal(displayPath("C:\\Users\\chuan\\code\\foo", WIN), "~\\code\\foo");
  assert.equal(displayPath("C:/Users/chuan/code/foo", WIN), "~/code/foo");
  assert.equal(displayPath("C:\\Users\\chuanx\\code", WIN), "C:\\Users\\chuanx\\code");
  assert.equal(displayPath("D:\\code\\x", WIN), "D:\\code\\x");
  assert.equal(displayPath("D:\\", WIN), "D:\\");
  assert.equal(displayPath("D:", WIN), "D:\\");

  const long = displayPath("C:\\Users\\chuan\\Documents\\code\\personal\\herdr-monster-hunter", WIN);
  assert.equal(long, "~\\…\\herdr-monster-hunter");
  assert.ok(long.length <= 30);
  assert.equal(displayPath("D:\\work\\one\\two\\three\\four\\five", WIN, 22), "D:\\…\\three\\four\\five");
  assert.equal(displayPath("\\\\server\\share\\team\\projects\\deep\\app", WIN, 30), "\\\\server\\share\\…\\deep\\app");
  assert.equal(displayPath("D:\\a-really-long-folder-name-that-never-fits", WIN), "…\\a-really-long-folder-name-that-never-fits");
  assert.ok(!displayPath("C:\\Users\\chuan\\code\\altr-herdr-pixel-hunter", WIN).includes("undefined"));

  assert.equal(folderName("C:\\Users\\chuan\\code\\foo", WIN), "foo");
  assert.equal(folderName("c:\\USERS\\chuan", WIN), "~");
  assert.equal(folderName("D:\\code\\x\\", WIN), "x");
  assert.equal(folderName("D:\\", WIN), "D:\\");
  assert.equal(folderName("\\\\server\\share", WIN), "share");

  const s = space({ name: "" });
  const { areas } = hunt({ spaces: [s], panes: [shell(s, { cwd: "C:\\Users\\chuan\\code\\shop-api" })], home: WIN });
  assert.equal(areas[0].name, "shop-api");
  assert.equal(areas[0].path, "~\\code\\shop-api");
});

test("POSIX paths keep / only and match home by case", () => {
  assert.equal(displayPath("/users/ME/code", HOME), "/users/ME/code");
  assert.equal(displayPath(`${HOME}/a\\b`, HOME), "~/a\\b");
  assert.equal(folderName(`${HOME}/code/shop-api`, HOME), "shop-api");
  assert.equal(folderName(HOME, HOME), "~");
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

test("with no cwd on the first terminal, the Area path falls back to the space folder, then home, never undefined", () => {
  const s = space({ folder: `${HOME}/code/shop-api`, branch: "feat/login" });
  const panes = [
    shell(s, { pane: "p1", terminal: "t1", cwd: undefined, branch: undefined }),
    shell(s, { pane: "p2", terminal: "t2", cwd: `${HOME}/elsewhere`, branch: "other" }),
  ];
  const [a] = hunt({ spaces: [s], panes, home: HOME }).areas;
  assert.equal(a.path, "~/code/shop-api");
  assert.equal(a.branch, "feat/login");

  const t = space({ folder: undefined, branch: undefined });
  const [b] = hunt({ spaces: [t], panes: [shell(t, { cwd: null, branch: null })], home: HOME }).areas;
  assert.equal(b.path, "~");
  assert.equal(b.branch, null);

  // Odd values from Herdr: nothing here may print as "undefined" (or "null", "[object …]").
  const odd = [undefined, null, "", 0, 42, {}, [], "   "];
  for (const cwd of odd) for (const folder of odd) for (const home of [HOME, "C:\\Users\\me", undefined, null, ""]) {
    const x = space({ name: "", folder });
    const [area] = hunt({ spaces: [x], panes: [shell(x, { cwd })], home }).areas;
    assert.equal(typeof area.path, "string");
    assert.ok(area.path.length > 0);
    assert.ok(!/undefined|null|object/.test(area.path), `${JSON.stringify({ cwd, folder, home })} → ${area.path}`);
    assert.ok(!/undefined|null|object/.test(area.name), area.name);
  }
  assert.ok(!displayPath("\\\\server", "C:\\Users\\me", 5).includes("undefined"));
  assert.ok(!displayPath("\\\\server\\share\\a-long-folder\\x", "C:\\Users\\me", 10).includes("undefined"));
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

// Random Respawn. `random` is injected; it is only called for a Respawn.
const IDS = MONSTERS.map((m) => m.id);
function respawning(random, index = 0) {
  const spaces = Array.from({ length: index + 1 }, (_, i) => space({ id: `r${i}` }));
  const a = spaces[index];
  let state = {};
  return {
    step(now, status) {
      const out = hunt({ spaces, panes: [agent(a, "r", { status })], home: HOME, state, now, random });
      state = JSON.parse(JSON.stringify(out.state)); // as shared state stores it
      return out.areas[index];
    },
    get state() { return state; },
    set state(s) { state = s; },
  };
}
const never = () => { throw new Error("random called without a Respawn"); };

test("an Area's first Monster is its map's own, and random is not used for it", () => {
  const { areas } = hunt({ spaces: Array.from({ length: 7 }, () => space()), home: HOME, random: never });
  assert.deepEqual(areas.map((a) => a.monster.id), [...IDS, IDS[0]]);
  const h = respawning(never, 5); // Lakeside
  assert.equal(h.step(0, "working").monster.id, "GiantFrog");
  assert.equal(h.step(MIN, "done").monster.id, "GiantFrog", "Slain: the one that fell lies there");
  assert.equal(h.state.monsters.r5.id, undefined, "nothing written before a Respawn");
});

test("a Respawn never repeats the Slain Monster and can pick any of the other five", () => {
  const seen = new Set();
  for (let k = 0; k < 5; k++) {
    const h = respawning(() => (k + 0.5) / 5); // Forest: the Giant Racoon falls first
    h.step(0, "done");
    const back = h.step(MIN, "working");
    assert.equal(back.mode, "hit");
    assert.notEqual(back.monster.id, "GiantRacoon");
    assert.equal(h.state.monsters.r0.id, back.monster.id, "kept in the persisted state");
    seen.add(back.monster.id);
  }
  assert.deepEqual([...seen].sort(), IDS.filter((id) => id !== "GiantRacoon").sort());
  // from a respawned Monster too, and with random at its edges (0, just under 1, 1, NaN)
  for (const r of [0, 0.999999, 1, NaN, -3]) {
    const h = respawning(() => r);
    h.step(0, "done");
    let last = h.step(MIN, "working").monster.id;
    for (let i = 0; i < 6; i++) {
      h.step((2 + 2 * i) * MIN, "done");
      const next = h.step((3 + 2 * i) * MIN, "working").monster.id;
      assert.notEqual(next, last, `random ${r}: a Respawn never brings back the one just Slain`);
      assert.ok(IDS.includes(next));
      last = next;
    }
  }
});

test("between Respawns the Monster stays: wearing, pausing and Slain keep it, and random isn't called", () => {
  const h = respawning(() => 0.99); // after the Racoon: the last of the others, the Giant Frog
  h.step(0, "done");
  assert.equal(h.step(MIN, "working").monster.id, "GiantFrog");
  const frog = h.state.monsters.r0.id;
  const calm = respawning(never);
  calm.state = h.state;
  for (const [t, status] of [[2, "working"], [3, "blocked"], [4, "idle"], [5, "working"], [6, "done"], [7, "idle"]]) {
    assert.equal(calm.step(t * MIN, status).monster.id, frog, `${status} keeps the Monster`);
  }
  assert.equal(calm.step(8 * MIN, "idle").mode, "slain");
});

test("the respawned Monster survives a restart; old state without an id means the map's own", () => {
  const h = respawning(() => 0.3, 1); // Desert
  h.step(0, "done");
  const back = h.step(MIN, "working");
  assert.notEqual(back.monster.id, "DemonCyclop");
  const saved = JSON.parse(JSON.stringify(h.state));
  const empty = hunt({ spaces: [], panes: [], home: HOME, state: saved, now: 2 * MIN, random: never });
  assert.deepEqual(empty.state.monsters, saved.monsters, "nothing is lost while Herdr is starting");
  const again = respawning(never, 1);
  again.state = empty.state;
  assert.equal(again.step(2 * MIN, "working").monster.id, back.monster.id);

  const spaces = [space({ id: "o0" }), space({ id: "o1" })];
  const old = { monsters: { o0: { hp: 40, since: null, slain: false }, o1: { hp: 0, since: null, slain: true, id: "NoSuchBoss" } } };
  const { areas, state } = hunt({ spaces, home: HOME, state: old, now: 0, random: never });
  assert.deepEqual(areas.map((a) => a.monster.id), ["GiantRacoon", "DemonCyclop"]);
  assert.equal(areas[0].hp, 40);
  assert.equal(state.monsters.o1.id, undefined, "an unknown id is dropped");
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

// Hunter row layout F (Pets ticket 04): name, program label, tokens

test("a Hunter is named after its tab; a tab without a name gives the Class name", () => {
  const a = space({ tabs: [
    { id: "tn-1", index: 1, name: "login", named: true },
    { id: "tn-2", index: 2, name: "2", named: false },
    { id: "tn-3", index: 3, name: "  " },
    { id: "tn-4", index: 4 },
    { id: "tn-5", index: 5, name: 42 },
  ] });
  const panes = ["tn-1", "tn-1", "tn-2", "tn-3", "tn-4", "tn-5"].map((tab, i) => agent(a, `n${i}`, { tab }));
  const hs = hunt({ spaces: [a], panes, home: HOME }).areas[0].hunters;
  assert.deepEqual(hs.map((h) => h.name), ["login", "login", "2", "Rogue", "Monk", "Samurai"]);
  assert.deepEqual(hs.map((h) => h.cls.name), ["Knight", "Mage", "Archer", "Rogue", "Monk", "Samurai"],
    "the name never changes the Class");
});

test("programLabel is null for Claude Code and the program's name otherwise", () => {
  const a = space();
  const panes = [
    agent(a, "cc", { program: "Claude Code", app: "claude-code" }),
    agent(a, "cc2", { program: "Claude Code" }),
    agent(a, "cc3", { program: "claude" }),
    agent(a, "cx", { program: "Codex", app: "codex" }),
    agent(a, "gm", { program: "Gemini" }),
    agent(a, "no", { program: "" }),
  ];
  const hs = hunt({ spaces: [a], panes, home: HOME }).areas[0].hunters;
  assert.deepEqual(hs.map((h) => h.programLabel), [null, null, null, "Codex", "Gemini", null]);
});

test("tokens read used/size for 200k and 1M windows, and are null without data", () => {
  const hs = hunters({
    a: rec({ used: 128000, size: 200000, left: 36 }),
    b: rec({ model: "Opus 5.5 (1M context)", used: 410000, size: 1000000, left: 59 }),
    c: rec({ used: 1499, size: 200000 }),
    d: rec({ used: 0, size: 200000, left: null }), // the first tick: no response yet
    e: rec({ used: 5000 }), // no size
    f: rec({ used: "lots", size: 200000 }),
  });
  assert.deepEqual(hs[0].tokens, { used: 128000, size: 200000, text: "128k/200k" });
  assert.deepEqual(hs[1].tokens, { used: 410000, size: 1000000, text: "410k/1M" });
  assert.equal(hs[2].tokens.text, "1k/200k");
  for (const h of hs.slice(3)) assert.equal(h.tokens, null, h.terminal);
  assert.deepEqual(hs[3].stamina.percent, null, "the first tick still shows STA —");
  const none = hunt({ spaces: [space({ id: "tk" })], panes: [agent({ id: "tk", tabs: [{ id: "tk-t1" }] }, "q")], home: HOME });
  assert.equal(none.areas[0].hunters[0].tokens, null, "no record: no tokens");
  // a record with tokens only still gives them (and STA — with no percentage)
  const only = hunters({ o: { v: 1, app: "claude-code", used: 64000, size: 200000, at: 0 } })[0];
  assert.equal(only.tokens.text, "64k/200k");
  assert.equal(only.stamina.percent, null);
});

test("an old record without tokens shows only the bar", () => {
  const [h] = hunters({ o: { v: 1, app: "claude-code", model: "Opus 5.5", left: 72, at: 0 } });
  assert.equal(h.tokens, null);
  assert.equal(h.stamina.percent, 72);
  assert.equal(h.stamina.level, "high");
  assert.equal(h.rank.text, "[A] Opus 5.5");
});

// Tabs and pane headers (ticket 07)

test("each tab shows its first Hunter in pane order, its worst state, and none without an agent", () => {
  const s = space({ tabs: [{ id: "tb-b", index: 2 }, { id: "tb-a", index: 1 }, { id: "tb-c", index: 3 }] });
  const panes = [
    shell(s, { tab: "tb-a", pane: "p-sh" }),
    agent(s, "t2", { tab: "tb-a", status: "working" }),
    agent(s, "t3", { tab: "tb-a", status: "blocked" }),
    agent(s, "t4", { tab: "tb-b", status: "done" }),
    shell(s, { tab: "tb-c", pane: "p-sh2", terminal: "sh2" }),
  ];
  const { areas } = hunt({ spaces: [s], panes, home: HOME });
  const tabs = areas[0].tabs;
  assert.deepEqual(tabs.map((t) => t.id), ["tb-a", "tb-b", "tb-c"]);
  assert.deepEqual(tabs.map((t) => t.index), [1, 2, 3]);
  // the lead is the first Hunter, not the shell before it and not the most urgent one
  assert.equal(tabs[0].lead.terminal, "t2");
  assert.equal(tabs[0].lead.cls.name, "Knight");
  assert.equal(tabs[0].worst, "help");
  assert.equal(tabs[0].hunters, 2);
  assert.equal(tabs[1].lead.terminal, "t4");
  assert.equal(tabs[1].worst, "cleared");
  assert.deepEqual([tabs[2].lead, tabs[2].worst, tabs[2].hunters], [null, null, 0]);
});

test("peach wins over focus: a pane Needing help is framed help even with the keyboard", () => {
  assert.equal(paneFrame("help", true), "help");
  assert.equal(paneFrame("help", false), "help");
  assert.equal(paneFrame("hunting", true), "focus");
  assert.equal(paneFrame("resting", false), null);
  assert.equal(paneFrame(undefined, true), "focus");

  const s = space();
  const panes = [
    agent(s, "t1", { status: "blocked", focused: true }),
    agent(s, "t2", { status: "working" }),
    shell(s, { focused: false }),
  ];
  const out = hunt({ spaces: [s], panes, home: HOME });
  assert.deepEqual(out.panes.map((p) => [p.terminal, p.frame]), [["t1", "help"], ["t2", null], ["sh-" + s.id, null]]);
  const moved = hunt({ spaces: [s], panes: panes.map((p) => ({ ...p, focused: p.terminal === "t2", status: p.terminal === "t1" ? "idle" : p.status })), home: HOME });
  assert.deepEqual(moved.panes.map((p) => p.frame), [null, "focus", null]);
});

test("pane headers get the Hunter, its own folder and branch; shells and mod panes get none", () => {
  const s = space({ tabs: [{ id: "x1", index: 1 }, { id: "x2", index: 2 }] });
  const other = space();
  const panes = [
    agent(s, "t1", { tab: "x2", cwd: `${HOME}/code/shop-api-cart`, branch: "fix/cart", status: "working" }),
    agent(s, "t2", { tab: "x1", cwd: `${HOME}/code/shop-api`, branch: "feat/login" }),
    shell(s, { tab: "x1", cwd: "/tmp", branch: null }),
    { pane: "p-mod", terminal: null, tab: "x1", status: null, title: "notes" },
    agent(other, "t9", { status: "blocked" }),
    agent(s, "t-gone", { tab: "elsewhere" }),
  ];
  const out = hunt({ spaces: [s, other], panes, home: HOME });
  const by = Object.fromEntries(out.panes.map((p) => [p.pane, p]));
  assert.deepEqual(Object.keys(by).sort(), ["p-mod", "p-sh-" + s.id, "p-t1", "p-t2", "p-t9"].sort());
  assert.equal(by["p-t1"].hunter.cls.name, "Mage"); // tab order: t2 (tab 1) came first
  assert.equal(by["p-t1"].hunter.state, "hunting");
  assert.equal(by["p-t1"].path, "~/code/shop-api-cart");
  assert.equal(by["p-t1"].branch, "fix/cart"); // its own branch, even where the Area's differs
  assert.equal(by["p-t1"].hunter.rank.label, "Claude Code");
  assert.equal(by["p-t2"].hunter.cls.name, "Knight");
  assert.equal(by["p-t9"].space, other.id);
  assert.equal(by["p-t9"].frame, "help");
  const sh = by["p-sh-" + s.id];
  assert.deepEqual([sh.hunter, sh.program, sh.path, sh.branch], [null, "zsh", "/tmp", null]);
  const mod = by["p-mod"];
  assert.deepEqual([mod.hunter, mod.terminal, mod.path, mod.branch, mod.frame], [null, null, null, null, null]);
});

// Ticket 08: Area expand and collapse.
const expanded = (areas) => Object.fromEntries(areas.map((a) => [a.id, a.expanded]));

test("by default only the current Area and an Area with a Hunter that Needs help are expanded", () => {
  const a = space({ id: "a", active: true }), b = space({ id: "b" }), c = space({ id: "c" }), d = space({ id: "d" });
  const panes = [agent(a, "a1"), agent(b, "b1", { status: "working" }), agent(c, "c1", { status: "blocked" }), shell(d)];
  const { areas, state } = hunt({ spaces: [a, b, c, d], panes, home: HOME });
  assert.deepEqual(expanded(areas), { a: true, b: false, c: true, d: false });
  assert.deepEqual(areas.map((x) => x.held), [false, false, true, false]);
  assert.deepEqual(state.collapsed, {}, "a default is not a choice: nothing is persisted");
});

test("a choice by hand wins over the default, both ways, and only the clicked Area changes", () => {
  const a = space({ id: "a", active: true }), b = space({ id: "b" });
  const panes = [agent(a, "a1"), agent(b, "b1")];
  const first = hunt({ spaces: [a, b], panes, home: HOME });
  let state = toggleArea(first.state, first.areas[0]); // collapse the current one
  state = toggleArea(state, first.areas[1]); // expand the other
  assert.deepEqual(state.collapsed, { a: true, b: false });
  assert.deepEqual(state.monsters, first.state.monsters, "the rest of the state is kept");
  const next = hunt({ spaces: [a, b], panes, home: HOME, state });
  assert.deepEqual(expanded(next.areas), { a: false, b: true });
  // switching spaces doesn't undo a choice
  const moved = hunt({ spaces: [{ ...a, active: false }, { ...b, active: true }], panes, home: HOME, state: next.state });
  assert.deepEqual(expanded(moved.areas), { a: false, b: true });
  // a second click goes back
  const again = hunt({ spaces: [a, b], panes, home: HOME, state: toggleArea(next.state, next.areas[0]) });
  assert.deepEqual(expanded(again.areas), { a: true, b: true });
});

test("a manual collapse survives a restart through JSON, and nothing is lost while Herdr starts", () => {
  const a = space({ id: "a", active: true }), b = space({ id: "b" });
  const panes = [agent(a, "a1"), agent(b, "b1")];
  const first = hunt({ spaces: [a, b], panes, home: HOME });
  const saved = JSON.parse(JSON.stringify(toggleArea(first.state, first.areas[0])));
  const empty = hunt({ spaces: [], panes: [], home: HOME, state: saved });
  assert.deepEqual(empty.state.collapsed, { a: true });
  const after = hunt({ spaces: [a, b], panes, home: HOME, state: JSON.parse(JSON.stringify(empty.state)) });
  assert.deepEqual(expanded(after.areas), { a: false, b: false });
  assert.deepEqual(after.state.collapsed, { a: true });
});

test("Needs help opens an Area even after a manual collapse; the chevron can't close it meanwhile", () => {
  const a = space({ id: "a", active: true }), b = space({ id: "b" });
  const calm = [agent(a, "a1"), agent(b, "b1", { status: "working" })];
  const first = hunt({ spaces: [a, b], panes: calm, home: HOME, state: { collapsed: { b: true } } });
  assert.equal(first.areas[1].expanded, false);
  const help = [agent(a, "a1"), agent(b, "b1", { status: "blocked" })];
  const urgent = hunt({ spaces: [a, b], panes: help, home: HOME, state: first.state });
  assert.equal(urgent.areas[1].expanded, true);
  assert.equal(urgent.areas[1].held, true);
  assert.equal(toggleArea(urgent.state, urgent.areas[1]), urgent.state, "a click while held changes nothing");
  assert.deepEqual(urgent.state.collapsed, { b: true }, "the choice is kept for after");
  const later = hunt({ spaces: [a, b], panes: calm, home: HOME, state: urgent.state });
  assert.equal(later.areas[1].expanded, false, "once help is given, the manual collapse is back");
});

test("choices of closed spaces are dropped; bad saved choices are ignored", () => {
  const a = space({ id: "a" });
  const state = { collapsed: { a: "yes", gone: true } };
  const { areas, state: next } = hunt({ spaces: [a], panes: [agent(a, "a1")], home: HOME, state });
  assert.equal(areas[0].expanded, false);
  assert.deepEqual(next.collapsed, {});
  assert.deepEqual(hunt({ spaces: [a], home: HOME, state: { collapsed: "bad" } }).state.collapsed, {});
});

// Class pins (classes.json): a named tab always gives its Hunters the pinned Class.
const tabbed = (id, tabs) => space({ id, tabs: tabs.map(([tid, name], i) => ({ id: tid, index: i + 1, name: name ?? String(i + 1), named: name != null })) });

test("a pinned tab gives its Hunter that Class, also when it comes back as a new terminal", () => {
  const a = tabbed("pin1", [["t-web", "web"], ["t-api", "api"]]);
  const pins = { tabs: { api: "Mage" } };
  const first = hunt({ spaces: [a], panes: [agent(a, "w1", { tab: "t-web" }), agent(a, "x1", { tab: "t-api" })], home: HOME, pins });
  assert.deepEqual(first.areas[0].hunters.map((h) => [h.terminal, h.cls.name]), [["w1", "Knight"], ["x1", "Mage"]]);
  assert.equal(first.state.classes.x1, "Mage");

  // The api tab moves first, its agent restarts (a new terminal) and the web tab closes.
  const moved = { ...a, tabs: [{ id: "t-api", index: 1, name: "api", named: true }] };
  const next = hunt({ spaces: [moved], panes: [agent(a, "x2", { tab: "t-api" })], home: HOME, pins, state: first.state });
  assert.deepEqual(next.areas[0].hunters.map((h) => [h.terminal, h.cls.name]), [["x2", "Mage"]]);

  // A pin wins over a Class the Hunter had before; names match trimmed and ignoring case.
  const old = { classes: { x1: "Knight" } };
  const again = hunt({ spaces: [a], panes: [agent(a, "x1", { tab: "t-api" })], home: HOME, pins: { tabs: { " API ": "mage" } }, state: old });
  assert.equal(again.areas[0].hunters[0].cls.name, "Mage");
});

test("unpinned Hunters still take Classes in order, around the pinned ones", () => {
  const a = tabbed("pin2", [["t1", null], ["t2", "api"], ["t3", "docs"], ["t4", null]]);
  const panes = [agent(a, "h1", { tab: "t1" }), agent(a, "h2", { tab: "t2" }), agent(a, "h3", { tab: "t3" }), agent(a, "h4", { tab: "t4" })];
  const { areas } = hunt({ spaces: [a], panes, home: HOME, pins: { tabs: { api: "Knight", docs: "Mage" } } });
  assert.deepEqual(areas[0].hunters.map((h) => h.cls.name), ["Archer", "Knight", "Mage", "Rogue"]);

  // A tab nobody named doesn't match by its position: "1" pins nothing.
  const pos = hunt({ spaces: [a], panes, home: HOME, pins: { tabs: { 1: "Samurai" } } });
  assert.deepEqual(pos.areas[0].hunters.map((h) => h.cls.name), ["Knight", "Mage", "Archer", "Rogue"]);
});

test("an unknown Class name or a broken config is ignored and the sidebar still draws", () => {
  const a = tabbed("pin3", [["t1", "api"], ["t2", "web"]]);
  const panes = [agent(a, "k1", { tab: "t1" }), agent(a, "k2", { tab: "t2" })];
  const plain = ["Knight", "Mage"];
  for (const pins of [{ tabs: { api: "Paladin", web: 3 } }, { tabs: ["Mage"] }, { tabs: null }, "Mage", null, undefined, { tabs: { "": "Mage" } }]) {
    const { areas } = hunt({ spaces: [a], panes, home: HOME, pins });
    assert.deepEqual(areas[0].hunters.map((h) => h.cls.name), plain, JSON.stringify(pins));
  }
  // A good entry next to a bad one still works.
  const mixed = hunt({ spaces: [a], panes, home: HOME, pins: { tabs: { api: "Paladin", web: "Samurai" } } });
  assert.deepEqual(mixed.areas[0].hunters.map((h) => h.cls.name), ["Knight", "Samurai"]);
  assert.deepEqual([...classPins({ tabs: { Api: "monk", api: "Knight", x: "Druid" } })], [["api", "Monk"]]);
});

test("the shipped classes.json parses and pins nothing by default", () => {
  const cfg = JSON.parse(readFileSync(new URL("../classes.json", import.meta.url), "utf8"));
  assert.equal(classPins(cfg).size, 0);
});

// Pets: records from the Pets hook script (pets.mjs), { [terminal]: record[] }.
const petRec = (agent, over = {}) => ({ v: 1, app: "claude-code", agent, type: "Explore", description: `task of ${agent}`,
  animal: "Dog", state: "hunting", startedAt: 1000, seenAt: 1000, ...over });

test("a Hunter shows its first 2 Pets, oldest first, and [+N] for the rest", () => {
  const s = space();
  const pets = { x1: [
    petRec("p3", { animal: "Frog", startedAt: 3000 }), petRec("p1", { animal: "Cat", startedAt: 1000 }),
    petRec("p4", { animal: "Cub", startedAt: 4000 }), petRec("p2", { animal: "Dog", startedAt: 2000 }),
  ] };
  const { areas } = hunt({ spaces: [s], panes: [agent(s, "x1", { status: "working", app: "claude-code" })], home: HOME, pets, now: 5000 });
  const h = areas[0].hunters[0];
  assert.deepEqual(h.pets.shown.map((p) => p.agent), ["p1", "p2"]);
  assert.equal(h.pets.more, 2);
  assert.deepEqual(h.pets.all.map((p) => p.agent), ["p1", "p2", "p3", "p4"]);
  const { staleAt, ...first } = h.pets.shown[0];
  assert.deepEqual(first, { agent: "p1", type: "Explore", description: "task of p1", animal: "Cat", state: "hunting", startedAt: 1000 });
  assert.equal(staleAt, 1000 + 120 * 1000);
  // two or fewer: no [+N]; none: an empty line the row leaves out
  const two = hunt({ spaces: [s], panes: [agent(s, "x1")], home: HOME, pets: { x1: pets.x1.slice(0, 2) }, now: 5000 });
  assert.equal(two.areas[0].hunters[0].pets.more, 0);
  assert.equal(two.areas[0].hunters[0].pets.shown.length, 2);
  const none = hunt({ spaces: [s], panes: [agent(s, "x1")], home: HOME, now: 5000 });
  assert.deepEqual(none.areas[0].hunters[0].pets, { shown: [], more: 0, all: [] });
});

test("a Pet is dropped at exactly the stale limit, and at a custom limit from rank.json", () => {
  const s = space();
  const panes = [agent(s, "x1", { status: "working" })];
  const pets = { x1: [petRec("p1", { seenAt: 10000 })] };
  const at = (now, ranks) => hunt({ spaces: [s], panes, home: HOME, pets, ranks, now }).areas[0].hunters[0].pets.all.length;
  const LIMIT = RANKS.petStaleAfterSeconds * 1000;
  assert.equal(RANKS.petStaleAfterSeconds, 120);
  assert.equal(at(10000 + LIMIT - 1), 1);
  assert.equal(at(10000 + LIMIT), 0, "dropped at exactly the limit");
  assert.equal(at(10000 + 29999, { petStaleAfterSeconds: 30 }), 1);
  assert.equal(at(10000 + 30000, { petStaleAfterSeconds: 30 }), 0, "a custom limit");
  assert.equal(at(10000 + LIMIT - 1, { petStaleAfterSeconds: -5 }), 1, "a bad limit falls back to 120 s");
  assert.equal(rankTable({ petStaleAfterSeconds: 45 }).petStaleAfterSeconds, 45);
  assert.equal(rankTable({ petStaleAfterSeconds: 45 }).staleAfterSeconds, RANKS.staleAfterSeconds, "the limits are separate");
});

test("Pets of closed or non-agent terminals, and bad records, are ignored", () => {
  const s = space();
  const panes = [agent(s, "x1"), shell(s)];
  const pets = {
    x1: [petRec("ok"), null, 5, petRec("noAnimal", { animal: "Lion" }), petRec("", {}), petRec("noBeat", { seenAt: "x" })],
    [`sh-${s.id}`]: [petRec("onShell")],
    gone: [petRec("ofClosed")],
  };
  const { areas } = hunt({ spaces: [s], panes, home: HOME, pets, now: 2000 });
  assert.equal(areas[0].hunters.length, 1);
  assert.deepEqual(areas[0].hunters[0].pets.all.map((p) => p.agent), ["ok"]);
  // a Pet of a shell or a closed terminal doesn't keep the Monster alive
  const quiet = hunt({ spaces: [s], panes: [shell(s)], home: HOME, pets, now: 2000 });
  assert.equal(quiet.areas[0].mode, "idle");
  for (const bad of [null, "x", 5, [], { x1: "nope" }]) {
    assert.deepEqual(hunt({ spaces: [s], panes, home: HOME, pets: bad, now: 2000 }).areas[0].hunters[0].pets.all, []);
  }
});

test("a Pet whose app differs from the pane's is ignored", () => {
  const s = space();
  const pets = { x1: [petRec("cc"), petRec("other", { app: "codex" }), petRec("noApp", { app: undefined })] };
  const codex = hunt({ spaces: [s], panes: [agent(s, "x1", { app: "codex", program: "Codex" })], home: HOME, pets, now: 2000 });
  assert.deepEqual(codex.areas[0].hunters[0].pets.all.map((p) => p.agent).sort(), ["noApp", "other"]);
  const claude = hunt({ spaces: [s], panes: [agent(s, "x1", { app: "claude-code" })], home: HOME, pets, now: 2000 });
  assert.deepEqual(claude.areas[0].hunters[0].pets.all.map((p) => p.agent).sort(), ["cc", "noApp"]);
});

test("a Hunting Pet keeps HP wearing down and prevents Slain while its Hunter is Cleared", () => {
  const MIN = 60 * 1000;
  const s = space();
  let state = {};
  const step = (now, status, petList) => {
    const out = hunt({ spaces: [s], panes: [agent(s, "x1", { status })], home: HOME, state, now,
      pets: petList ? { x1: petList } : {} });
    state = out.state;
    return out.areas[0];
  };
  assert.equal(step(0, "working").mode, "hit");
  const cleared = step(MIN, "done", [petRec("p1", { seenAt: MIN })]);
  assert.equal(cleared.mode, "hit", "the Pet still Hunts: the Monster lives");
  assert.equal(cleared.wearing, true);
  assert.equal(cleared.worst, "hunting", "the Area's dot counts the Pet");
  assert.equal(cleared.hunters[0].state, "cleared", "the Hunter itself stays Cleared");
  const later = step(3 * MIN, "done", [petRec("p1", { seenAt: 3 * MIN })]);
  assert.ok(later.hp < cleared.hp, "HP keeps wearing down");
  assert.ok(later.hp > 0);
  const done = step(4 * MIN, "done", []);
  assert.equal(done.mode, "slain", "once the Pet is gone the Cleared Hunter slays it");
  // Resting Hunter, Hunting Pet: still wearing, and the Pet alone never slays it
  state = {};
  const resting = step(0, "idle", [petRec("p1", { seenAt: 0 })]);
  assert.equal(resting.mode, "hit");
  assert.equal(step(MIN, "idle", []).mode, "idle", "a Pet is never done");
  // a stale Pet stops counting
  state = {};
  assert.equal(step(0, "done", [petRec("p1", { seenAt: -RANKS.petStaleAfterSeconds * 1000 })]).mode, "slain");
});

test("Pets never change Class assignment", () => {
  const s = space({ tabs: [{ id: "ta", index: 1 }, { id: "tb", index: 2 }] });
  const panes = [agent(s, "x1", { tab: "ta" }), agent(s, "x2", { tab: "tb" })];
  const plain = hunt({ spaces: [s], panes, home: HOME });
  const many = { x1: Array.from({ length: 12 }, (_, i) => petRec(`p${i}`, { animal: ["Cat", "Dog", "Frog"][i % 3], startedAt: i })) };
  const withPets = hunt({ spaces: [s], panes, home: HOME, pets: many, now: 2000, state: {} });
  assert.deepEqual(withPets.areas[0].hunters.map((h) => h.cls.name), plain.areas[0].hunters.map((h) => h.cls.name));
  assert.deepEqual(withPets.state.classes, plain.state.classes);
  assert.equal(withPets.areas[0].hunters.length, 2, "Pets are not Hunters");
  assert.equal(withPets.areas[0].arena.hunters.length, 2, "the arena picks Hunters only");
});

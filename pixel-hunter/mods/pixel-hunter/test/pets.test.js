// The Pets hook script as a black box: hook JSON on stdin and env in, Pet records on disk out.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "..", "pets.mjs");
const ANIMALS = ["Cat", "Dog", "Dog2", "Cub", "Frog", "Racoon", "Monkey", "Chicken", "Pig", "Fish"];
const newDir = () => mkdtempSync(join(tmpdir(), "ph-pets-"));

function run(action, input, { terminal = "t7", dir = newDir() } = {}) {
  const env = { ...process.env, PIXEL_HUNTER_PETS: dir };
  if (terminal == null) delete env.HC_TERMINAL_ID; else env.HC_TERMINAL_ID = terminal;
  const stdin = typeof input === "string" ? input : JSON.stringify(input);
  const r = spawnSync(process.execPath, [SCRIPT, action], { input: stdin, env, encoding: "utf8" });
  assert.equal(r.status, 0, `${action} exits 0`);
  assert.equal(r.stdout, "", `${action} prints nothing`);
  assert.equal(r.stderr, "", `${action} writes nothing to stderr`);
  return { ...r, dir };
}
const petFile = (dir, agent, terminal = "t7") => join(dir, terminal, `${agent}.json`);
const pet = (dir, agent, terminal = "t7") => {
  const f = petFile(dir, agent, terminal);
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
};
// Every file under the pets dir with its contents, to see that nothing changed.
function snapshot(dir) {
  const out = {};
  for (const t of existsSync(dir) ? readdirSync(dir) : []) {
    for (const f of readdirSync(join(dir, t))) out[`${t}/${f}`] = readFileSync(join(dir, t, f), "utf8");
  }
  return out;
}
const startOf = (agent, over = {}) => ({ session_id: "s-1", agent_id: agent, agent_type: "Explore", hook_event_name: "SubagentStart", ...over });
const task = (id, over = {}) => ({ id, type: "local_agent", agentType: "Explore", status: "running", description: "find auth middleware", label: "Reading src/auth.ts", startTime: 1, ...over });
const tick = (tasks) => ({ session_id: "s-1", columns: 120, tasks });

test("start writes the Pet's record; a second start after stop brings the same animal back", () => {
  const before = Date.now();
  const { dir } = run("start", startOf("a87b73ce5f399ecb8"));
  const r = pet(dir, "a87b73ce5f399ecb8");
  const { startedAt, seenAt, startAt, animal, ...rest } = r;
  assert.deepEqual(rest, { v: 1, app: "claude-code", terminal: "t7", session: "s-1", agent: "a87b73ce5f399ecb8", type: "Explore", description: "", state: "hunting" });
  assert.ok(ANIMALS.includes(animal));
  assert.ok(startedAt >= before && startedAt <= Date.now());
  assert.equal(seenAt, startedAt);
  assert.equal(startAt, startedAt);
  assert.deepEqual(readdirSync(join(dir, "t7")), ["a87b73ce5f399ecb8.json"], "no temporary files are left behind");

  run("stop", { agent_id: "a87b73ce5f399ecb8", hook_event_name: "SubagentStop" }, { dir });
  assert.equal(pet(dir, "a87b73ce5f399ecb8"), null);
  run("start", startOf("a87b73ce5f399ecb8"), { dir });
  assert.equal(pet(dir, "a87b73ce5f399ecb8").animal, animal, "same agent_id, same animal");
  // the same id again while its animal is taken by another Pet: it gets another one
  run("stop", { agent_id: "a87b73ce5f399ecb8" }, { dir });
  mkdirSync(join(dir, "t7"), { recursive: true });
  writeFileSync(petFile(dir, "other"), JSON.stringify({ v: 1, agent: "other", animal, seenAt: Date.now(), session: "s-1" }));
  run("start", startOf("a87b73ce5f399ecb8"), { dir });
  assert.notEqual(pet(dir, "a87b73ce5f399ecb8").animal, animal);
});

test("a start for a Pet that still has its record keeps its animal, start time and description", () => {
  const dir = newDir();
  run("start", startOf("a1"), { dir });
  run("tasks", tick([task("a1")]), { dir });
  const first = pet(dir, "a1");
  run("start", startOf("a1"), { dir });
  const again = pet(dir, "a1");
  assert.equal(again.animal, first.animal);
  assert.equal(again.startedAt, first.startedAt);
  assert.equal(again.description, "find auth middleware");
});

test("stop deletes the record, and stopping a Pet with no record is fine", () => {
  const dir = newDir();
  run("start", startOf("a1"), { dir });
  run("start", startOf("a2"), { dir });
  run("stop", { agent_id: "a1" }, { dir });
  assert.equal(pet(dir, "a1"), null);
  assert.ok(pet(dir, "a2"), "only that Pet goes");
  // Claude Code's internal agents stop with agent_type "" and never started
  const before = snapshot(dir);
  run("stop", { agent_id: "aInternal", agent_type: "" }, { dir });
  run("stop", { agent_id: "aInternal" }, { dir: newDir() });
  assert.deepEqual(snapshot(dir), before);
});

test("tasks fills in type and description by id, refreshes seenAt and deletes finished tasks", () => {
  const dir = newDir();
  run("start", startOf("a1", { agent_type: "general-purpose" }), { dir });
  run("start", startOf("a2"), { dir });
  run("start", startOf("a3"), { dir });
  // back-date the heartbeats and starts so the tick has something to refresh and may delete
  for (const id of ["a1", "a2", "a3"]) writeFileSync(petFile(dir, id), JSON.stringify({ ...pet(dir, id), seenAt: 1000, startAt: 1000 }));
  const before = Date.now();
  run("tasks", tick([
    task("a1", { agentType: "general-purpose", description: "run the test suite", label: "Running npm test" }),
    task("a2", { status: "completed" }),
    task("a3", { status: "failed" }),
    task("a4", { status: "running" }), // never started here: no record is made
    task("../a1"), null, 5,
  ]), { dir });
  const a1 = pet(dir, "a1");
  assert.equal(a1.type, "general-purpose");
  assert.equal(a1.description, "run the test suite", "the description, never the label");
  assert.ok(a1.seenAt >= before);
  assert.equal(pet(dir, "a2"), null);
  assert.equal(pet(dir, "a3"), null);
  assert.equal(pet(dir, "a4"), null);
  run("start", startOf("a5"), { dir });
  writeFileSync(petFile(dir, "a5"), JSON.stringify({ ...pet(dir, "a5"), startAt: Date.now() - 11000 }));
  run("tasks", tick([task("a5", { status: "killed" })]), { dir });
  assert.equal(pet(dir, "a5"), null);
});

test("a Pet that just started again isn't deleted by a tick that still says its task completed", () => {
  // seen live: a subagent ends its turn to wait (SubagentStop), wakes under the same id
  // (SubagentStart), and the next tick or two still call its task "completed"
  const dir = newDir();
  run("start", startOf("a1"), { dir });
  run("stop", { agent_id: "a1" }, { dir });
  run("start", startOf("a1"), { dir });
  run("tasks", tick([task("a1", { status: "completed" })]), { dir });
  assert.ok(pet(dir, "a1"), "kept: it started again under 10 s ago");
  run("tasks", tick([task("a1", { status: "running" })]), { dir });
  assert.ok(pet(dir, "a1"));
  writeFileSync(petFile(dir, "a1"), JSON.stringify({ ...pet(dir, "a1"), startAt: Date.now() - 10000 }));
  run("tasks", tick([task("a1", { status: "completed" })]), { dir });
  assert.equal(pet(dir, "a1"), null, "10 s after its start a finished task deletes it");
});

test("tasks rewrites an unchanged record at most once every 30 s", () => {
  const dir = newDir();
  run("start", startOf("a1"), { dir });
  run("tasks", tick([task("a1")]), { dir });
  const first = pet(dir, "a1").seenAt;
  run("tasks", tick([task("a1")]), { dir });
  assert.equal(pet(dir, "a1").seenAt, first, "unchanged and seen under 30 s ago: not rewritten");
  run("tasks", tick([task("a1", { description: "a new task" })]), { dir });
  assert.equal(pet(dir, "a1").description, "a new task", "a change is written at once");
  const now = Date.now();
  writeFileSync(petFile(dir, "a1"), JSON.stringify({ ...pet(dir, "a1"), seenAt: now - 29000 }));
  run("tasks", tick([task("a1", { description: "a new task" })]), { dir });
  assert.equal(pet(dir, "a1").seenAt, now - 29000, "29 s old: kept");
  writeFileSync(petFile(dir, "a1"), JSON.stringify({ ...pet(dir, "a1"), seenAt: now - 31000 }));
  run("tasks", tick([task("a1", { description: "a new task" })]), { dir });
  assert.ok(pet(dir, "a1").seenAt >= now, "31 s old: touched");
  writeFileSync(petFile(dir, "a1"), JSON.stringify({ ...pet(dir, "a1"), seenAt: now + 3600000 }));
  run("tasks", tick([task("a1", { description: "a new task" })]), { dir });
  assert.ok(pet(dir, "a1").seenAt <= Date.now(), "a heartbeat in the future is fixed");
});

test("no two live Pets of a terminal share an animal until all 10 are in use", () => {
  const dir = newDir();
  const ids = Array.from({ length: 12 }, (_, i) => `agent${i}x${(i * 7919).toString(16)}`);
  for (const id of ids.slice(0, 10)) run("start", startOf(id), { dir });
  const animals = ids.slice(0, 10).map((id) => pet(dir, id).animal);
  assert.deepEqual([...animals].sort(), [...ANIMALS].sort(), "the first 10 Pets have all 10 animals");
  for (const id of ids.slice(10)) run("start", startOf(id), { dir });
  for (const id of ids.slice(10)) assert.ok(ANIMALS.includes(pet(dir, id).animal), "past 10, any animal");
  // a stopped Pet frees its animal for the next one
  run("stop", { agent_id: ids[3] }, { dir });
  run("stop", { agent_id: ids[10] }, { dir });
  run("stop", { agent_id: ids[11] }, { dir });
  run("start", startOf("newcomer"), { dir });
  assert.equal(pet(dir, "newcomer").animal, animals[3]);
  // another terminal's Pets don't count
  const other = newDir();
  for (const id of ids.slice(0, 10)) run("start", startOf(id), { dir: other, terminal: "t8" });
  run("start", startOf(ids[0]), { dir: other, terminal: "t9" });
  assert.equal(pet(other, ids[0], "t9").animal, pet(other, ids[0], "t8").animal, "same id, same seeded animal");
});

test("a leftover record from another session that stopped reporting is cleared, and its animal is free", () => {
  const dir = newDir();
  run("start", startOf("a1"), { dir });
  const animal = pet(dir, "a1").animal;
  writeFileSync(petFile(dir, "old"), JSON.stringify({ v: 1, agent: "old", session: "s-0", animal: "Cat", seenAt: Date.now() - 600000 }));
  writeFileSync(petFile(dir, "quiet"), JSON.stringify({ v: 1, agent: "quiet", session: "s-1", animal: "Dog", seenAt: Date.now() - 600000 }));
  run("start", startOf("a2"), { dir });
  assert.equal(pet(dir, "old"), null, "another session's stale Pet is gone");
  assert.ok(pet(dir, "quiet"), "this session's quiet Pet is left to the sidebar");
  assert.notEqual(pet(dir, "a2").animal, animal);
});

test("control and bidi characters are stripped and text is capped at 80 characters", () => {
  const dir = newDir();
  run("start", startOf("a1", { agent_type: "Exp\u001b[2Jlore‮", session_id: "s\u0000-1" }), { dir });
  assert.equal(pet(dir, "a1").type, "Exp[2Jlore");
  assert.equal(pet(dir, "a1").session, "s-1");
  const evil = "\u001b]0;pwned\u0007find‏ auth\u0085؜⁦ middleware⁩\r\n" + "x".repeat(200);
  run("tasks", tick([task("a1", { agentType: "Plan⁦", description: evil })]), { dir });
  const r = pet(dir, "a1");
  assert.equal(r.type, "Plan");
  assert.ok(r.description.startsWith("]0;pwnedfind auth middleware"));
  assert.equal(Array.from(r.description).length, 80);
  const raw = readFileSync(petFile(dir, "a1"), "utf8");
  assert.doesNotMatch(raw, /\\u00(0|1)|\\u202e|\\u2066|\\u200f|\\u061c|\\u2069|\\u0085|\\u007f/i);
  assert.doesNotMatch(raw, /[\u0000-\u0009\u000b-\u001f\u007f-\u009f؜‎‏‪-‮⁦-⁩]/);
});

test("malformed stdin exits 0, writes nothing to stderr and changes nothing", () => {
  const dir = newDir();
  run("start", startOf("a1"), { dir });
  const before = snapshot(dir);
  const bad = ["", "not json", "{", "null", "[1,2]", "42", '"text"', '{"agent_id": 5}', '{"agent_id": {"x": 1}}', '{"tasks": "x"}', '{"tasks": [{"id": 5}]}'];
  for (const action of ["start", "stop", "tasks", "help", "unhelp"]) {
    for (const input of bad) run(action, input, { dir }); // run() checks exit 0, no stdout, no stderr
  }
  run("unknown", startOf("a9"), { dir });
  run("", startOf("a9"), { dir });
  assert.deepEqual(snapshot(dir), before);
});

test("nothing is written without a plain HC_TERMINAL_ID or agent id", () => {
  for (const terminal of [null, "", "../t1", "t1/x", "..", ".", "t 1", "t1\u001b", " t1"]) {
    const { dir } = run("start", startOf("a1"), { terminal });
    run("tasks", tick([task("a1")]), { dir, terminal });
    assert.deepEqual(existsSync(dir) ? readdirSync(dir) : [], [], `nothing for ${JSON.stringify(terminal)}`);
  }
  for (const agent of ["../a1", "a/b", "..", "", null]) {
    const { dir } = run("start", startOf(agent), {});
    assert.deepEqual(snapshot(dir), {}, `nothing for agent ${JSON.stringify(agent)}`);
  }
});

const helpOf = (agent, over = {}) => ({ session_id: "s-1", agent_id: agent, agent_type: "Explore", hook_event_name: "PermissionRequest",
  tool_name: "Bash", tool_input: { command: "echo probe > probe1.txt" }, ...over });
const usedOf = (agent, over = {}) => ({ session_id: "s-1", agent_id: agent, agent_type: "Explore", hook_event_name: "PostToolUse",
  tool_name: "Bash", tool_response: { stdout: "" }, ...over });

test("help marks a Pet Needs help and sets helpAt; unhelp marks it Hunting again", () => {
  const dir = newDir();
  run("start", startOf("a1"), { dir });
  run("start", startOf("a2"), { dir });
  const before = Date.now();
  run("help", helpOf("a1"), { dir });
  const r = pet(dir, "a1");
  assert.equal(r.state, "help");
  assert.ok(r.helpAt >= before && r.helpAt <= Date.now());
  assert.ok(r.seenAt >= r.helpAt - 1, "the prompt is a sign of life");
  assert.equal(pet(dir, "a2").state, "hunting", "only that Pet");
  const a2 = readFileSync(petFile(dir, "a2"), "utf8");
  run("unhelp", usedOf("a2"), { dir });
  assert.equal(readFileSync(petFile(dir, "a2"), "utf8"), a2, "a Hunting Pet's tool call writes nothing");
  run("unhelp", usedOf("a1"), { dir });
  const back = pet(dir, "a1");
  assert.equal(back.state, "hunting");
  assert.equal(back.helpAt, undefined, "helpAt goes with Needs help");
  assert.equal(back.animal, r.animal);
  assert.deepEqual(readdirSync(join(dir, "t7")).sort(), ["a1.json", "a2.json"], "no temporary files are left behind");
});

test("help and unhelp do nothing without an agent_id or for an unknown Pet", () => {
  const dir = newDir();
  run("start", startOf("a1"), { dir });
  const before = snapshot(dir);
  // the Hunter's own prompt and tool calls carry no agent_id
  const { agent_id: _a, agent_type: _t, ...own } = helpOf("a1");
  run("help", own, { dir });
  run("help", helpOf("unknown"), { dir });
  run("help", helpOf("../a1"), { dir });
  assert.deepEqual(snapshot(dir), before);
  run("help", helpOf("a1"), { dir });
  const marked = snapshot(dir);
  const { agent_id: _b, agent_type: _u, ...ownUse } = usedOf("a1");
  run("unhelp", ownUse, { dir });
  run("unhelp", usedOf("unknown"), { dir });
  assert.deepEqual(snapshot(dir), marked);
  assert.equal(pet(dir, "unknown"), null, "help never creates a record");
  // nothing outside a Herdr terminal
  const { dir: outside } = run("help", helpOf("a1"), { terminal: null });
  assert.deepEqual(snapshot(outside), {});
});

test("a tasks tick more than 2 s after helpAt marks the Pet Hunting; one within 2 s leaves it in Needs help", () => {
  const dir = newDir();
  run("start", startOf("a1"), { dir });
  run("tasks", tick([task("a1")]), { dir });
  run("help", helpOf("a1"), { dir });
  // a tick right after the prompt opened (it was already on its way): still Needs help
  run("tasks", tick([task("a1")]), { dir });
  assert.equal(pet(dir, "a1").state, "help");
  const at = (ms) => writeFileSync(petFile(dir, "a1"), JSON.stringify({ ...pet(dir, "a1"), helpAt: Date.now() - ms }));
  at(1500);
  run("tasks", tick([task("a1")]), { dir });
  assert.equal(pet(dir, "a1").state, "help", "1.5 s after helpAt: within 2 s");
  // a denied prompt fires no PostToolUse: the next tick (none come while it is open) clears it
  at(2500);
  const before = Date.now();
  run("tasks", tick([task("a1")]), { dir });
  const r = pet(dir, "a1");
  assert.equal(r.state, "hunting", "2.5 s after helpAt: the prompt has closed");
  assert.equal(r.helpAt, undefined);
  assert.ok(r.seenAt >= before);
  // a help record without a helpAt is cleared by any tick
  writeFileSync(petFile(dir, "a1"), JSON.stringify({ ...pet(dir, "a1"), state: "help" }));
  run("tasks", tick([task("a1")]), { dir });
  assert.equal(pet(dir, "a1").state, "hunting");
});

test("a Pet that Needs help keeps its animal from a new Pet even when its heartbeat is old", () => {
  const dir = newDir();
  run("start", startOf("a1"), { dir });
  run("help", helpOf("a1"), { dir });
  const animal = pet(dir, "a1").animal;
  // the prompt has been open for 10 minutes: no tick has refreshed seenAt
  writeFileSync(petFile(dir, "a1"), JSON.stringify({ ...pet(dir, "a1"), session: "s-0", seenAt: Date.now() - 600000, helpAt: Date.now() - 600000 }));
  run("start", startOf("a2"), { dir });
  assert.ok(pet(dir, "a1"), "not cleared away as a leftover");
  assert.notEqual(pet(dir, "a2").animal, animal);
});

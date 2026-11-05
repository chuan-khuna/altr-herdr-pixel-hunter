#!/usr/bin/env node
// pixel-hunter's optional Claude Code hook script for Pets (plain Node, no Herdr imports).
//
// Every Claude Code subagent is a Pet of the Hunter (the Herdr terminal, HC_TERMINAL_ID) it
// runs in. Claude Code calls this script with the hook's JSON on stdin; the first argument
// picks the action:
//   start  SubagentStart hook: writes the Pet's record and picks its animal
//   stop   SubagentStop hook: deletes the record (a missing one is fine: Claude Code's
//          internal agents stop without ever starting)
//   tasks  the subagentStatusLine command, every 5 s while the agent panel has a row: fills
//          in each running task's type and description and refreshes its heartbeat
//          (seenAt); a completed, failed or killed task deletes its record
// Any other action does nothing.
//
//   ~/.claude/settings.json (see the README's Pets section):
//     "subagentStatusLine": { "type": "command",
//                             "command": "node ~/.config/herdr-app/mods/pixel-hunter/pets.mjs tasks" },
//     "hooks": { "SubagentStart": [{ "hooks": [{ "type": "command", "command": "node …/pets.mjs start" }] }],
//                "SubagentStop":  [{ "hooks": [{ "type": "command", "command": "node …/pets.mjs stop" }] }] }
//
// Record: <pets dir>/<terminal>/<agent id>.json =
//   { v: 1, app: "claude-code", terminal, session, agent, type, description, animal,
//     state: "hunting", startedAt, seenAt, startAt }
//   type:        the subagent type (hook agent_type, then the task's agentType), or null
//   description: the task the Hunter gave it (the task's description, never its label), "" until
//                the first tick
//   animal:      one of ANIMALS. A start picks one that none of the terminal's live Pets uses
//                (all 10 in use: any), the first choice seeded from the agent id, so a subagent
//                that stops and starts again under the same id (a nested parent waiting for its
//                child) comes back as the same animal when it is free
//   startedAt / seenAt: ms; seenAt is the heartbeat the sidebar drops a Pet by
//   startAt:     when the last start came (ms). A subagent that ends its turn to wait (for its
//                child, or a background shell) gets SubagentStop, then a new SubagentStart
//                under the same id when it wakes, while the ticks still call its task
//                "completed" for a few seconds: a finished task deletes a record only when its
//                last start is START_GRACE_MS old
// Pets dir: $PIXEL_HUNTER_PETS, else <Herdr home>/data/pixel-hunter/pets with Herdr home
// $HERDR_APP_HOME or ~/.config/herdr-app. Task ids match records by tasks[].id, which is the
// hook's agent_id.
//
// It never blocks or breaks Claude Code: it prints nothing (the agent panel keeps its own
// rows), always exits 0, and bad input, an id that isn't a plain id or a failed write
// changes nothing. Nothing is written outside a Herdr terminal. `tasks` rewrites a record
// only when its type or description changes or its seenAt is 30 s old, so a tick every 5 s
// doesn't redraw the window every time.
import { readFileSync, writeFileSync, mkdirSync, renameSync, rmSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const ANIMALS = ["Cat", "Dog", "Dog2", "Cub", "Frog", "Racoon", "Monkey", "Chicken", "Pig", "Fish"];
const TOUCH_MS = 30 * 1000;
const START_GRACE_MS = 10 * 1000; // two ticks
// A sibling seen this recently is live: its animal is taken. The sidebar drops Pets after
// petStaleAfterSeconds (default 120); one older than that from another session is a leftover
// (a crash before SubagentStop) and a start clears it away.
const LIVE_MS = 120 * 1000;
const MAX_TEXT = 80;
const MAX_FILES = 256;
const ENDED = new Set(["completed", "failed", "killed"]);

// C0/C1 controls and DEL, and the bidi marks, embeddings, overrides and isolates.
const UNSAFE = /[\u0000-\u001f\u007f-\u009f؜‎‏‪-‮⁦-⁩]/g;

/** Text safe to store and show: no control or bidi characters, trimmed, at most MAX_TEXT. */
function clean(text) {
  if (typeof text !== "string") return null;
  const out = Array.from(text.replace(UNSAFE, "").trim()).slice(0, MAX_TEXT).join("").trim();
  return out || null;
}

/** A plain id usable as a file name, taken as it is (nothing stripped), or null. */
function plainId(v) {
  return typeof v === "string" && v.length <= MAX_TEXT && /^[A-Za-z0-9._-]+$/.test(v) && v !== "." && v !== ".." ? v : null;
}

function petsDir(env) {
  if (env.PIXEL_HUNTER_PETS) return env.PIXEL_HUNTER_PETS;
  const app = env.HERDR_APP_HOME || join(homedir(), ".config", "herdr-app");
  return join(app, "data", "pixel-hunter", "pets");
}

function read(file) {
  try {
    const r = JSON.parse(readFileSync(file, "utf8"));
    return r && typeof r === "object" && !Array.isArray(r) ? r : null;
  } catch { return null; }
}

function write(dir, name, rec) {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${name}.json`);
  const tmp = join(dir, `.${name}.${process.pid}.tmp`);
  writeFileSync(tmp, JSON.stringify(rec) + "\n");
  try { renameSync(tmp, file); } catch {
    // Windows can refuse to replace a file someone is reading: write it in place instead
    try { writeFileSync(file, JSON.stringify(rec) + "\n"); } finally { rmSync(tmp, { force: true }); }
  }
}

// A small stable hash of the agent id: the first animal tried.
function seed(id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return h % ANIMALS.length;
}

/** The animal for a new Pet: from the seeded one on, the first that `used` lacks. */
function pickAnimal(id, used) {
  const s = seed(id);
  for (let i = 0; i < ANIMALS.length; i++) {
    const a = ANIMALS[(s + i) % ANIMALS.length];
    if (!used.has(a)) return a;
  }
  return ANIMALS[s];
}

function start(input, dir, agent, terminal, now) {
  const session = clean(input.session_id);
  const used = new Set();
  let names = [];
  try { names = readdirSync(dir); } catch { /* no Pets yet */ }
  for (const name of names.filter((n) => n.endsWith(".json") && !n.startsWith(".")).slice(0, MAX_FILES)) {
    if (name === `${agent}.json`) continue;
    const r = read(join(dir, name));
    const fresh = r && Number.isFinite(r.seenAt) && now - r.seenAt < LIVE_MS;
    if (fresh) { if (ANIMALS.includes(r.animal)) used.add(r.animal); continue; }
    if (!r || r.session !== session) rmSync(join(dir, name), { force: true }); // a leftover
  }
  const old = read(join(dir, `${agent}.json`));
  const keep = old && ANIMALS.includes(old.animal) && !used.has(old.animal) ? old : null;
  write(dir, agent, {
    v: 1,
    app: "claude-code",
    terminal,
    session,
    agent,
    type: clean(input.agent_type) ?? keep?.type ?? null,
    description: keep?.description ?? "",
    animal: keep?.animal ?? pickAnimal(agent, used),
    state: "hunting",
    startedAt: Number.isFinite(keep?.startedAt) ? keep.startedAt : now,
    seenAt: now,
    startAt: now,
  });
}

function tasks(input, dir, now) {
  if (!Array.isArray(input.tasks)) return;
  for (const t of input.tasks.slice(0, MAX_FILES)) {
    if (!t || typeof t !== "object") continue;
    const id = plainId(t.id);
    if (!id) continue;
    const file = join(dir, `${id}.json`);
    const old = read(file);
    if (!old) continue; // only Pets a SubagentStart wrote
    if (ENDED.has(t.status)) {
      const woke = Number.isFinite(old.startAt) && now >= old.startAt && now - old.startAt < START_GRACE_MS;
      if (!woke) rmSync(file, { force: true }); // else a stale "completed" from before it woke
      continue;
    }
    const type = clean(t.agentType) ?? old.type ?? null;
    const description = clean(t.description) ?? old.description ?? "";
    const fresh = Number.isFinite(old.seenAt) && now >= old.seenAt && now - old.seenAt < TOUCH_MS;
    if (fresh && type === old.type && description === old.description) continue;
    write(dir, id, { ...old, type, description, seenAt: now });
  }
}

function main(stdin, env, action, now) {
  if (!["start", "stop", "tasks"].includes(action)) return;
  let input = null;
  try { input = JSON.parse(stdin); } catch { return; }
  if (!input || typeof input !== "object" || Array.isArray(input)) return;
  const terminal = plainId(env.HC_TERMINAL_ID);
  if (!terminal) return;
  const dir = join(petsDir(env), terminal);
  if (action === "tasks") return tasks(input, dir, now);
  const agent = plainId(input.agent_id);
  if (!agent) return;
  if (action === "stop") rmSync(join(dir, `${agent}.json`), { force: true });
  else start(input, dir, agent, terminal, now);
}

try {
  let stdin = "";
  try { stdin = readFileSync(0, "utf8"); } catch { /* no stdin */ }
  main(stdin, process.env, process.argv[2], Date.now());
} catch { /* never break Claude Code */ }

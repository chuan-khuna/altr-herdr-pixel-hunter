// The statusLine script as a black box: JSON on stdin in, a session file (and a status line) out.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "..", "statusline.mjs");

function run(stdin, { terminal = "t7", dir = mkdtempSync(join(tmpdir(), "ph-sl-")), args = [] } = {}) {
  const env = { ...process.env, PIXEL_HUNTER_SESSIONS: dir };
  if (terminal == null) delete env.HC_TERMINAL_ID; else env.HC_TERMINAL_ID = terminal;
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { input: stdin, env, encoding: "utf8" });
  const file = join(dir, `${terminal}.json`);
  return { ...r, dir, record: terminal != null && existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null };
}

const SESSION = {
  hook_event_name: "Status",
  session_id: "abc-123",
  cwd: "/Users/me/code/shop-api",
  model: { id: "claude-opus-5-5", display_name: "Opus 5.5" },
  context_window: { total_input_tokens: 76000, context_window_size: 200000, used_percentage: 38, remaining_percentage: 62 },
};

test("Claude Code's JSON on stdin gives the terminal's session record and a status line", () => {
  const before = Date.now();
  const r = run(JSON.stringify(SESSION));
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "Opus 5.5 · 62% context left\n");
  const { at, ...rest } = r.record;
  assert.deepEqual(rest, {
    v: 1, app: "claude-code", terminal: "t7", session: "abc-123",
    model: "Opus 5.5", modelId: "claude-opus-5-5", left: 62, used: 76000, size: 200000,
  });
  assert.ok(at >= before && at <= Date.now());
  assert.deepEqual(readdirSync(r.dir), ["t7.json"], "no temporary files are left behind");
});

test("context left comes from Claude Code only: 100 - used without remaining, null with neither", () => {
  const used = run(JSON.stringify({ ...SESSION, context_window: { used_percentage: 81 } }));
  assert.equal(used.record.left, 19);
  const none = run(JSON.stringify({ ...SESSION, context_window: { context_window_size: 200000, current_usage: null, used_percentage: null, remaining_percentage: null } }));
  assert.equal(none.record.left, null, "never estimated from tokens or anything else");
  assert.equal(none.stdout, "Opus 5.5\n");
  const noWindow = run(JSON.stringify({ session_id: "x", model: { id: "claude-haiku-5" } }));
  assert.equal(noWindow.record.left, null);
  assert.equal(noWindow.record.model, "claude-haiku-5", "the model id stands in for a missing display name");
});

test("context tokens are recorded as Claude Code reports them, and null when it does not", () => {
  const big = run(JSON.stringify({ ...SESSION, model: { id: "claude-opus-5-5[1m]", display_name: "Opus 5.5 (1M context)" },
    context_window: { total_input_tokens: 410000, context_window_size: 1000000, used_percentage: 41, remaining_percentage: 59 } }));
  assert.equal(big.record.used, 410000);
  assert.equal(big.record.size, 1000000);
  // the first tick: used 0, the percentages null; the window size is already known
  const first = run(JSON.stringify({ ...SESSION, context_window: { total_input_tokens: 0, context_window_size: 200000,
    current_usage: null, used_percentage: null, remaining_percentage: null } }));
  assert.equal(first.record.used, 0);
  assert.equal(first.record.size, 200000);
  assert.equal(first.record.left, null);
  // absent token fields: null, never computed from the percentages
  const none = run(JSON.stringify({ ...SESSION, context_window: { used_percentage: 38, remaining_percentage: 62 } }));
  assert.equal(none.record.left, 62);
  assert.equal(none.record.used, null, "not 38% of anything");
  assert.equal(none.record.size, null);
  const noWindow = run(JSON.stringify({ session_id: "x", model: { id: "claude-haiku-5" } }));
  assert.equal(noWindow.record.used, null);
  assert.equal(noWindow.record.size, null);
  // odd values are not used
  const odd = run(JSON.stringify({ ...SESSION, context_window: { total_input_tokens: "lots", context_window_size: -5, remaining_percentage: 50 } }));
  assert.equal(odd.record.used, null);
  assert.equal(odd.record.size, null);
  const zero = run(JSON.stringify({ ...SESSION, context_window: { total_input_tokens: 10, context_window_size: 0 } }));
  assert.equal(zero.record.size, null, "a window of 0 tokens is not a window");
  // tokens alone still make a record
  const only = run(JSON.stringify({ context_window: { total_input_tokens: 5000, context_window_size: 200000 } }));
  assert.equal(only.record.used, 5000);
  assert.equal(only.record.model, null);
});

test("a change in used tokens is written at once", () => {
  const dir = mkdtempSync(join(tmpdir(), "ph-sl-"));
  run(JSON.stringify(SESSION), { dir });
  const more = run(JSON.stringify({ ...SESSION, context_window: { ...SESSION.context_window, total_input_tokens: 77000 } }), { dir });
  assert.equal(more.record.used, 77000);
});

test("control and bidi characters are stripped from everything written and printed", () => {
  const evil = {
    ...SESSION,
    session_id: "ab\u0000c\u001b[2J",
    model: { id: "claude-‮opus⁦-5", display_name: "\u001b]0;pwned\u0007Opus‏ 5.5\u0085؜⁩\r\n" },
  };
  const r = run(JSON.stringify(evil));
  assert.equal(r.status, 0);
  assert.equal(r.record.model, "]0;pwnedOpus 5.5");
  assert.equal(r.record.modelId, "claude-opus-5");
  assert.equal(r.record.session, "abc[2J");
  const raw = readFileSync(join(r.dir, "t7.json"), "utf8");
  assert.doesNotMatch(raw, /\\u00(0|1)|\\u202e|\\u2066|\\u200f|\\u061c|\\u2069|\\u0085|\\u007f/i);
  assert.doesNotMatch(r.stdout.trimEnd(), /[\u0000-\u001f\u007f-\u009f؜‎‏‪-‮⁦-⁩]/);
});

test("malformed input doesn't crash it, writes nothing and keeps the last record", () => {
  const dir = mkdtempSync(join(tmpdir(), "ph-sl-"));
  run(JSON.stringify(SESSION), { dir });
  for (const bad of ["", "not json", "{", "null", "[1,2]", "42", '"text"', '{"model": 5, "context_window": "x"}']) {
    const r = run(bad, { dir });
    assert.equal(r.status, 0, `exit 0 for ${JSON.stringify(bad)}`);
    assert.equal(r.stderr, "", `no error output for ${JSON.stringify(bad)}`);
  }
  const r = run("{", { dir });
  assert.equal(r.record.model, "Opus 5.5", "the good record is still there");
  const odd = run('{"model": {"id": "claude-opus-5-5"}, "context_window": {"remaining_percentage": "lots"}}');
  assert.equal(odd.record.model, "claude-opus-5-5");
  assert.equal(odd.record.left, null, "a percentage that isn't a number is not used");
});

test("outside a Herdr terminal it records nothing but still prints the line", () => {
  const r = run(JSON.stringify(SESSION), { terminal: null });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "Opus 5.5 · 62% context left\n");
  assert.deepEqual(readdirSync(r.dir), []);
  const sneaky = run(JSON.stringify(SESSION), { terminal: "../t1" });
  assert.deepEqual(readdirSync(sneaky.dir), [], "a terminal id is never a path");
});

test("--quiet records without printing; an unchanged record isn't rewritten on every message", () => {
  const dir = mkdtempSync(join(tmpdir(), "ph-sl-"));
  const q = run(JSON.stringify(SESSION), { dir, args: ["--quiet"] });
  assert.equal(q.stdout, "");
  const first = q.record.at;
  assert.equal(run(JSON.stringify(SESSION), { dir }).record.at, first, "same values within a minute: kept");
  const changed = run(JSON.stringify({ ...SESSION, context_window: { remaining_percentage: 55 } }), { dir });
  assert.equal(changed.record.left, 55, "a new value is written at once");
  // an old record with the same values is touched so the sidebar knows it's still fresh
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "t7.json"), JSON.stringify({ ...changed.record, at: 1 }));
  assert.ok(run(JSON.stringify({ ...SESSION, context_window: { remaining_percentage: 55 } }), { dir }).record.at > 1);
});

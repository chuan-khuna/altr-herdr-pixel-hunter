#!/usr/bin/env node
// pixel-hunter's optional Claude Code statusLine script (plain Node, no Herdr imports).
//
// Claude Code runs it with the session as JSON on stdin. It records the model's name and the
// context window left for the Herdr terminal it runs in (HC_TERMINAL_ID, set by herdr-core),
// so the sidebar can show Rank and Stamina, and prints a short status line of its own.
//
//   ~/.claude/settings.json:
//     "statusLine": { "type": "command", "refreshInterval": 60,
//                     "command": "node ~/.config/herdr-app/mods/pixel-hunter/statusline.mjs" }
//   --quiet   record only, print nothing (to call it from a status line script of your own)
//
// Record: <sessions dir>/<terminal>.json =
//   { v: 1, app: "claude-code", terminal, session, model, modelId, left, at }
//   model/modelId: model.display_name / model.id, with control and bidi characters stripped
//   left: context_window.remaining_percentage (else 100 - used_percentage), null when Claude
//         Code hasn't said yet; never estimated from anything else
//   at:   when it was written (ms); the sidebar marks a record older than its limit as "old"
// Sessions dir: $PIXEL_HUNTER_SESSIONS, else <Herdr home>/data/pixel-hunter/sessions with
// Herdr home $HERDR_APP_HOME or ~/.config/herdr-app.
//
// It never fails Claude Code's status line: bad input or a failed write records nothing (or
// keeps the last record) and exits 0. An unchanged record is rewritten at most once a minute,
// so a busy session doesn't redraw the window on every message.
import { readFileSync, writeFileSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const TOUCH_MS = 60 * 1000;
const MAX_TEXT = 80;

// C0/C1 controls and DEL, and the bidi marks, embeddings, overrides and isolates.
const UNSAFE = /[\u0000-\u001f\u007f-\u009f؜‎‏‪-‮⁦-⁩]/g;

/** Text safe to store and show: no control or bidi characters, trimmed, at most MAX_TEXT. */
function clean(text) {
  if (typeof text !== "string") return null;
  const out = Array.from(text.replace(UNSAFE, "").trim()).slice(0, MAX_TEXT).join("").trim();
  return out || null;
}

const pct = (v) => (typeof v === "number" && Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : null);

/** The session record from Claude Code's statusLine JSON (parsed), or null if it isn't one. */
function recordFrom(input, terminal, now) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const model = input.model && typeof input.model === "object" ? input.model : {};
  const cw = input.context_window && typeof input.context_window === "object" ? input.context_window : {};
  const remaining = pct(cw.remaining_percentage);
  const used = pct(cw.used_percentage);
  const name = clean(model.display_name) ?? clean(model.id);
  const left = remaining ?? (used == null ? null : 100 - used);
  if (name == null && left == null) return null; // nothing to show: keep the last record
  return {
    v: 1,
    app: "claude-code",
    terminal,
    session: clean(input.session_id),
    model: name,
    modelId: clean(model.id),
    left,
    at: now,
  };
}

/** The terminal id as a file name, or null outside a Herdr terminal. */
function terminalId(env) {
  const t = clean(env.HC_TERMINAL_ID ?? "");
  return t && /^[A-Za-z0-9._-]+$/.test(t) && t !== "." && t !== ".." ? t : null;
}

function sessionsDir(env) {
  if (env.PIXEL_HUNTER_SESSIONS) return env.PIXEL_HUNTER_SESSIONS;
  const app = env.HERDR_APP_HOME || join(homedir(), ".config", "herdr-app");
  return join(app, "data", "pixel-hunter", "sessions");
}

/** The status line Claude Code shows. */
function line(rec) {
  if (!rec) return "";
  const parts = [rec.model, rec.left == null ? null : `${Math.round(rec.left)}% context left`].filter(Boolean);
  return parts.join(" · ");
}

const same = (a, b) => a && b && ["app", "session", "model", "modelId", "left"].every((k) => a[k] === b[k]);

function save(dir, rec, now) {
  const file = join(dir, `${rec.terminal}.json`);
  let old = null;
  try { old = JSON.parse(readFileSync(file, "utf8")); } catch { /* none yet, or unreadable */ }
  if (same(old, rec) && Number.isFinite(old.at) && now - old.at < TOUCH_MS && now >= old.at) return;
  mkdirSync(dir, { recursive: true });
  const tmp = join(dir, `.${rec.terminal}.${process.pid}.tmp`);
  writeFileSync(tmp, JSON.stringify(rec) + "\n");
  try { renameSync(tmp, file); } catch {
    // Windows can refuse to replace a file someone is reading: write it in place instead
    try { writeFileSync(file, JSON.stringify(rec) + "\n"); } finally { rmSync(tmp, { force: true }); }
  }
}

function main(stdin, env, argv, now) {
  let input = null;
  try { input = JSON.parse(stdin); } catch { return ""; }
  const terminal = terminalId(env);
  const rec = recordFrom(input, terminal, now);
  if (rec && terminal) {
    try { save(sessionsDir(env), rec, now); } catch { /* the status line still shows */ }
  }
  return argv.includes("--quiet") ? "" : line(rec);
}

try {
  let stdin = "";
  try { stdin = readFileSync(0, "utf8"); } catch { /* no stdin */ }
  const out = main(stdin, process.env, process.argv.slice(2), Date.now());
  if (out) process.stdout.write(out + "\n");
} catch { /* never break Claude Code's status line */ }

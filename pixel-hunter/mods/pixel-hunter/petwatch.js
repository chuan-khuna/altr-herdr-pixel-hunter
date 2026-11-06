// Pets input, read off the UI thread and kept on the role's View:
//   self.pets  { [terminal]: record[] } from the Pets hook script (pets.mjs): one folder per
//              Herdr terminal, one file per Claude Code subagent; a watch on the folder re-reads
//              them when one changes. undefined until the first read is done.
// Without the hook setup nothing is ever written there, so no Pet is ever shown. Pets keep the
// Monster alive, so every role that runs world() reads them: otherwise the copies would
// disagree on the Monster's persisted state (world.js writes nothing until they're read).
// No timer: dropping a Pet that stopped reporting is the sidebar's wake one-shot's job.
import { appHome, readTextFile, watchFolder } from "herdr";
import * as fs from "fs/promises";

const MAX_TERMINALS = 64;
const MAX_FILES = 256; // in all
const PLAIN = /^[A-Za-z0-9._-]+$/;
export const petsDir = () => `${appHome()}/data/pixel-hunter/pets`;

async function readJson(path) {
  try { return JSON.parse((await readTextFile(path)) ?? "null"); } catch { return null; }
}

async function list(dir) {
  try { return (await fs.readdir(dir)).filter((n) => PLAIN.test(n) && !n.startsWith(".")).sort(); } catch { return []; }
}

async function readPets(dir) {
  const out = {};
  let left = MAX_FILES;
  for (const terminal of (await list(dir)).slice(0, MAX_TERMINALS)) {
    const recs = [];
    for (const name of (await list(`${dir}/${terminal}`)).filter((n) => n.endsWith(".json"))) {
      if (left-- <= 0) break;
      const rec = await readJson(`${dir}/${terminal}/${name}`);
      if (rec && typeof rec === "object" && !Array.isArray(rec)) recs.push(rec);
    }
    if (recs.length) out[terminal] = recs;
  }
  return out;
}

export function startPets(self, cx) {
  self.pets = undefined;
  cx.spawn(async (cx) => {
    const dir = petsDir();
    try { await fs.mkdir(dir, { recursive: true }); } catch { /* the watch below says if it's missing */ }
    for (let first = true; ; first = false) {
      const change = watchFolder(dir); // watch first, so a write during the read isn't missed
      const next = await readPets(dir);
      if (first || JSON.stringify(next) !== JSON.stringify(self.pets)) {
        self.pets = next;
        cx.notify();
      }
      try { await change; } catch { return; } // no folder to watch: keep what was read
    }
  });
}

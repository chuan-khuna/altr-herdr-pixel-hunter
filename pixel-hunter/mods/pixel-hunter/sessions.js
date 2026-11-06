// Rank and Stamina inputs, read off the UI thread and kept on the role's View:
//   self.ranks     rank.json (the grade table and freshness limit), read when the mod loads;
//                  saving it reloads the mod, so an edit shows at once
//   self.sessions  { [terminal]: record } from the statusLine script (statusline.mjs), one
//                  file per terminal; a watch on the folder re-reads them when one changes
// Without the script nothing is ever written there, so every Hunter shows its program and "STA —".
import { appHome, readTextFile, watchFolder } from "herdr";
import * as fs from "fs/promises";

const MAX_FILES = 256;
export const sessionsDir = () => `${appHome()}/data/pixel-hunter/sessions`;
const rankFile = () => `${appHome()}/mods/pixel-hunter/rank.json`;

async function readJson(path) {
  try { return JSON.parse((await readTextFile(path)) ?? "null"); } catch { return null; }
}

async function readSessions(dir) {
  let names = [];
  try { names = await fs.readdir(dir); } catch { return {}; }
  const out = {};
  for (const name of names.filter((n) => n.endsWith(".json") && !n.startsWith(".")).slice(0, MAX_FILES)) {
    const rec = await readJson(`${dir}/${name}`);
    if (rec && typeof rec === "object") out[name.slice(0, -5)] = rec;
  }
  return out;
}

export function startSessions(self, cx) {
  self.sessions = {};
  self.ranks = null;
  cx.spawn(async (cx) => {
    self.ranks = await readJson(rankFile());
    const dir = sessionsDir();
    try { await fs.mkdir(dir, { recursive: true }); } catch { /* the watch below says if it's missing */ }
    for (let first = true; ; first = false) {
      const change = watchFolder(dir); // watch first, so a write during the read isn't missed
      const next = await readSessions(dir);
      if (first || JSON.stringify(next) !== JSON.stringify(self.sessions)) {
        self.sessions = next;
        cx.notify();
      }
      try { await change; } catch { return; } // no folder to watch: keep what was read
    }
  });
}

// Class pins: classes.json in the mod folder, { "tabs": { "api": "Mage" } }, kept on the
// role's View as self.pins (see classPins() in hunt.js for the rules). Every role that draws
// Hunters reads it, so they all agree on each Hunter's Class. It's read when the mod loads;
// saving the file reloads every copy, so an edit shows at once without restarting Herdr.
// Until the read is done self.pins is undefined and world() writes no persisted state.
import { appHome, readTextFile } from "herdr";

export const pinsFile = () => `${appHome()}/mods/pixel-hunter/classes.json`;

export function startPins(self, cx) {
  self.pins = undefined;
  cx.spawn(async (cx) => {
    let cfg = null;
    try { cfg = JSON.parse((await readTextFile(pinsFile())) ?? "null"); } catch { /* missing or broken: no pins */ }
    self.pins = cfg;
    cx.notify();
  });
}

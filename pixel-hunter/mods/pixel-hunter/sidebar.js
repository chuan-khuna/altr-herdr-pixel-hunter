// Sidebar body under the logo: the arena of the current Area, then the Area list.
//
// Three things change with time while no data does: HP wears while a hunt runs, a Stamina
// record turns old (stale), and a Pet that stopped reporting is dropped (petStaleAfterSeconds).
// Herdr doesn't redraw for any of them, so one one-shot timer asks for a redraw at the
// earliest moment needed: HP_TICK_MS from now while any HP is wearing, when the next fresh
// record turns stale, or when the next Pet is due to be dropped. Each render arms it again only if something still
// needs it (an earlier need supersedes a later one, whose timer then does nothing). With
// nobody Hunting, no fresh record and no Pet nothing is armed and nothing redraws.
import { v_flex } from "gpui-base";
import { colors, FONT_UI } from "./theme.js";
import { world } from "./world.js";
import { arena } from "./arena.js";
import { areaList } from "./areas.js";
import { startSessions } from "./sessions.js";
import { startPins } from "./pins.js";
import { startPets } from "./petwatch.js";

export const HP_TICK_MS = 10 * 1000;

export function sidebarInit(self, cx, p) {
  startPins(self, cx);
  if (!p?.demo) { startSessions(self, cx); startPets(self, cx); } // the demo carries its own records
}

// When the sidebar next needs a redraw on its own, or null.
function wakeAt(model, now) {
  let at = model.areas.some((a) => a.wearing) ? now + HP_TICK_MS : Infinity;
  for (const a of model.areas) {
    for (const h of a.hunters) {
      if (h.stamina.staleAt != null) at = Math.min(at, h.stamina.staleAt + 1);
      for (const pet of h.pets.all) at = Math.min(at, pet.staleAt); // dropped at exactly staleAt
    }
  }
  return Number.isFinite(at) ? at : null;
}

function arm(self, cx, at, now) {
  if (at == null || (self.wakeAt != null && self.wakeAt <= at)) return;
  self.wakeAt = at;
  cx.timer.after(Math.max(0, at - now), (cx) => {
    if (self.wakeAt !== at) return; // superseded by an earlier one
    self.wakeAt = null;
    cx.notify();
  });
}

export function sidebar(self, cx) {
  const c = colors();
  const now = Date.now();
  const model = world(self, now);
  const scene = arena(self, model, c, cx);
  if (cx) arm(self, cx, wakeAt(model, now), now);
  return v_flex().id("ph-sidebar").size_full().min_h(0).bg(c.chrome)
    .font_family(FONT_UI).text_size(15).text_color(c.foreground)
    .when(scene != null, (el) => el.child(scene))
    .child(areaList(self, model, c));
}

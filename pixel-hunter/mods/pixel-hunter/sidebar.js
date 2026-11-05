// Sidebar body under the logo: the arena of the current Area, then the Area list.
//
// HP wears with time, but Herdr doesn't redraw the sidebar on its own while a hunt runs
// (no data changes for many seconds), so while any Monster's HP is wearing one one-shot
// timer asks for a redraw HP_TICK_MS later; it is armed again from that render only if HP
// is still wearing. With nobody Hunting nothing is armed and nothing redraws.
import { v_flex } from "gpui-base";
import { colors, FONT_UI } from "./theme.js";
import { world } from "./world.js";
import { arena } from "./arena.js";
import { areaList } from "./areas.js";

export const HP_TICK_MS = 10 * 1000;

export function sidebar(self, cx) {
  const c = colors();
  const model = world();
  const scene = arena(self, model, c, cx);
  if (cx && !self.hpTick && model.areas.some((a) => a.wearing)) {
    self.hpTick = true;
    cx.timer.after(HP_TICK_MS, (cx) => { self.hpTick = false; cx.notify(); });
  }
  return v_flex().id("ph-sidebar").size_full().min_h(0).bg(c.chrome)
    .font_family(FONT_UI).text_size(15).text_color(c.foreground)
    .when(scene != null, (el) => el.child(scene))
    .child(areaList(self, model, c));
}

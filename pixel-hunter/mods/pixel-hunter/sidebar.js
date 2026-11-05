// Sidebar body under the logo: the arena of the current Area, then the Area list.
import { v_flex } from "gpui-base";
import { colors, FONT_UI } from "./theme.js";
import { world } from "./world.js";
import { arena } from "./arena.js";
import { areaList } from "./areas.js";

export function sidebar(self, cx) {
  const c = colors();
  const model = world();
  const scene = arena(self, model, c, cx);
  return v_flex().id("ph-sidebar").size_full().min_h(0).bg(c.chrome)
    .font_family(FONT_UI).text_size(15).text_color(c.foreground)
    .when(scene != null, (el) => el.child(scene))
    .child(areaList(self, model, c));
}

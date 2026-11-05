// Sidebar body under the logo: the Area list (ticket 03). Ticket 04 adds the arena above it.
import { v_flex } from "gpui-base";
import { colors, FONT_UI } from "./theme.js";
import { world } from "./world.js";
import { areaList } from "./areas.js";

export function sidebar(self) {
  const c = colors();
  const model = world();
  return v_flex().id("ph-sidebar").size_full().min_h(0).bg(c.chrome)
    .font_family(FONT_UI).text_size(15).text_color(c.foreground)
    .child(areaList(self, model, c));
}

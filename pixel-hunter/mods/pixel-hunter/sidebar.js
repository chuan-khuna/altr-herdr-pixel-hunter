// Sidebar body under the logo. Empty chrome for now: ticket 03 adds the Area list,
// ticket 04 the arena.
import { v_flex } from "gpui-base";
import { colors } from "./theme.js";

export function sidebar() {
  const c = colors();
  return v_flex().id("ph-sidebar").size_full().bg(c.chrome);
}

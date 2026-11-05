// Sidebar top row, 44 px: room for the macOS traffic lights, then the logo.
import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { window } from "herdr";
import { colors, FONT_LOGO } from "./theme.js";

export function logo() {
  const c = colors();
  const lights = window()?.platform === "macos" ? 82 : 12;
  return h_flex().id("ph-logo").size_full().items_center().pl(lights).pr(12)
    .bg(c.chrome)
    .child(div().font_family(FONT_LOGO).text_size(10).text_color(c.foreground).child("PIXEL HUNTER"));
}

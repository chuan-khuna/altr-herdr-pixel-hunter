// pixel-hunter: one mod, many roles. The layout picks the role with props:
//   { role: "logo" }     the sidebar's top row: "PIXEL HUNTER" in Press Start 2P
//   { role: "sidebar" }  the sidebar body (arena and Area list come in later tickets)
// Later roles (tabs, pane header) are added here, so the hunt model exists once.

import { View, div } from "gpui-kit";
import { props } from "herdr";
import { logo } from "./logo.js";
import { sidebar } from "./sidebar.js";

const ROLES = { logo, sidebar };

export default class PixelHunter extends View {
  render(cx) {
    const role = ROLES[props()?.role];
    return role ? role(this, cx) : div();
  }
}

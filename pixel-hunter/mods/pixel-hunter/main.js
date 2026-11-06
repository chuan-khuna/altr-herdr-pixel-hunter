// pixel-hunter: one mod, many roles. The layout picks the role with props:
//   { role: "logo" }     the sidebar's top row: "PIXEL HUNTER" in Press Start 2P
//   { role: "sidebar" }  the sidebar body: the arena (arena.js) and the Area list (areas.js),
//                        both from the hunt model (hunt.js via world.js)
//                        add demo: true to draw the fixed demo.js snapshot (screenshots)
//   { role: "tabs" }     the tab bar (tabs.js): Hunter faces, state dots, Files / Changes
//   { role: "pane" }     a pane header (pane.js), set as the tab block's pane.header; Herdr
//                        adds { pane, terminal } to the props
// Every role reads the same hunt model, so it exists once.
// A role may have an init (run once per copy), e.g. the sidebar starts reading session records.

import { View, div } from "gpui-kit";
import { props } from "herdr";
import { logo } from "./logo.js";
import { sidebar, sidebarInit } from "./sidebar.js";
import { tabs, tabsInit } from "./tabs.js";
import { paneHeader, paneInit } from "./pane.js";

const ROLES = { logo, sidebar, tabs, pane: paneHeader };
const INITS = { sidebar: sidebarInit, tabs: tabsInit, pane: paneInit };

export default class PixelHunter extends View {
  init(_props, cx) {
    const p = props();
    INITS[p?.role]?.(this, cx, p);
  }

  render(cx) {
    const role = ROLES[props()?.role];
    return role ? role(this, cx) : div();
  }
}

// The tab bar (44 px): the shown Area's tabs, then +, Files, Changes and (Windows, Linux) the
// window buttons. Each tab: the 24 px face of its first Hunter (a map icon with no agent), its
// name and a state dot; the shown tab is framed mint. Behaves like Herdr's shipped `tabs` mod:
// click selects, double-click renames, drag onto another tab moves, right-click opens the tab
// menu, × closes the shown tab, the wheel steps through tabs, + opens Herdr's new-menu.
// Files and Changes open the shipped `files` / `changes` mods in the layout's hidden `panel`
// column (stack `panel-body`), remembered per space like the shipped tab bar does.
import { div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, run, openOverlay, window, shared, layout, settings } from "herdr";
import { colors, FONT_UI, FRAME } from "./theme.js";
import { world } from "./world.js";
import { startPins } from "./pins.js";
import { smallFace, stateColor, plain, SMALL_FACE } from "./areas.js";

const ICONS = "mods/pixel-hunter/icons";
export const TAB_H = 32;
const BUTTON = 32;

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

export function tabsInit(self, cx) {
  startPins(self, cx);
  self.pressed = null;
  try { self.panels = JSON.parse(localStorage.getItem("panels") ?? "{}") ?? {}; } catch { self.panels = {}; }
}

// The side panel is remembered per space (the shipped tab bar's rule): switching shows that
// space's choice (closed if it never had one), and opening or closing it records it.
function syncPanel(self, space, panel, body, enabled) {
  if (!space || !panel) return;
  const now = panel.hidden ? null : body?.active ?? null;
  if (space.id !== self.space) {
    const first = self.space === undefined;
    self.space = space.id; self.pending = null;
    if (!(first && !(space.id in self.panels))) {
      const stored = self.panels[space.id] ?? null, want = enabled.includes(stored) ? stored : null;
      if (want !== now) {
        self.pending = { want, until: Date.now() + 1000 };
        if (want) { run("layout.select", { stack: "panel-body", child: want }); run("layout.show", { id: "panel" }); }
        else run("layout.hide", { id: "panel" });
        return;
      }
    }
  }
  // Until the restore lands (or something else won), the old state isn't a choice.
  if (self.pending) {
    if (self.pending.want !== now && Date.now() < self.pending.until) return;
    self.pending = null;
  }
  if (self.panels[space.id] === now) return;
  self.panels[space.id] = now;
  try { localStorage.setItem("panels", JSON.stringify(self.panels)); } catch { /* kept in memory */ }
}

const stop = (_e, cx) => cx.stop_propagation();

// A 32 px square button framed like a tab: mint frame and `selected` while on.
function square(id, on, c, content, tip, action) {
  return div().id(id).size(BUTTON).flex_none().flex().items_center().justify_center()
    .border(FRAME).border_color(on ? c.accent : c.border).bg(on ? c.selected : c.surface)
    .text_color(on ? c.foreground : c.dim)
    .hover((s) => s.text_color(c.foreground))
    .when(Boolean(tip), (el) => el.tooltip(tip))
    .on_mouse_down("left", stop).on_click(action).child(content);
}

function tabItem(self, tab, view, space, c) {
  const on = tab.active;
  const lead = view?.lead ?? null;
  const worst = view?.worst ?? null;
  const i = space.tabs.findIndex((x) => x.id === tab.id);
  return h_flex().id(`ph-tab-${tab.id}`).h(TAB_H).pl(4).pr(10).gap(8).items_center().flex_none().cursor_pointer()
    .border(FRAME).border_color(on ? c.accent : c.border).bg(on ? c.selected : c.surface)
    .text_color(on ? c.foreground : c.dim)
    .when(!on, (el) => el.hover((s) => s.text_color(c.foreground)))
    .on_mouse_down("left", (e, cx) => {
      cx.stop_propagation();
      self.pressed = i;
      if (e.click_count === 2) run("tab.rename", { id: tab.id });
    })
    .on_mouse_up("left", () => {
      const from = self.pressed; self.pressed = null;
      if (from !== null && from !== i && space.tabs[from]) run("tab.move", { id: space.tabs[from].id, index: i + 1 });
      else run("tab.select", { id: tab.id });
    })
    .on_mouse_down("right", (_e, cx) => {
      cx.stop_propagation();
      openOverlay({ mod: "menu", kind: "popup", width: 200, props: { tab: "tab", target: { id: tab.id, space: space.id } } });
    })
    .child(lead
      ? smallFace(lead.cls)
      : div().size(SMALL_FACE).flex_none().flex().items_center().justify_center()
        .child(svg(`${ICONS}/map.svg`).size(SMALL_FACE).text_color(c.dim)))
    .child(div().max_w(170).truncate().child(plain(tab.name)))
    // zoomed: Herdr's zoom icon (a "Z" after the name reads as a digit in Pixelify Sans)
    .when(Boolean(tab.zoomed), (el) => el.child(svg("mods/pane/zoom.svg").size(12).flex_none().text_color(c.dim)))
    .child(div().size(8).flex_none().bg(worst ? stateColor(c, worst) : c.border))
    .when(on, (el) => el.child(div().id(`ph-tab-close-${tab.id}`).flex_none().text_color(c.dim)
      .hover((s) => s.text_color(c.foreground))
      .on_mouse_down("left", stop)
      .on_click((_e, cx) => { cx.stop_propagation(); run("tab.close", { id: tab.id }); })
      .child(svg("mods/pane/close.svg").size(12))));
}

export function tabs(self) {
  const c = colors();
  const space = spaces().find((s) => s.active);
  const model = world(self);
  const area = model.areas.find((a) => a.id === space?.id);
  const views = new Map((area?.tabs ?? []).map((t) => [t.id, t]));
  const shown = space?.tabs ?? [];

  const root = layout(), sidebar = find(root, "sidebar"), w = window();
  // macOS: leave room for the traffic lights when the sidebar is hidden or narrow.
  const lightsPadding = w?.platform === "macos" && w.titlebar === "none" && !w.fullscreen && root?.traffic_lights
    ? Math.max(10, (root.traffic_lights[0] + 64) / (settings()?.zoom ?? 1) - (sidebar?.hidden ? 0 : sidebar?.size?.px ?? 0))
    : 10;
  const panel = find(root, "panel"), body = find(root, "panel-body");
  const enabled = shared("workspace.panels") ?? ["files", "changes"];
  syncPanel(self, space, panel, body, enabled);
  const panelButton = (id, label) => {
    const on = Boolean(panel && !panel.hidden && body?.active === id);
    return square(`ph-panel-${id}`, on, c, svg(`${ICONS}/${id}.svg`).size(16), label, () => {
      if (on) run("layout.hide", { id: "panel" });
      else { run("layout.select", { stack: "panel-body", child: id }); run("layout.show", { id: "panel" }); }
    });
  };
  const winButton = (id, icon, action) => div().id(id).size(BUTTON).flex_none().flex().items_center().justify_center()
    .text_color(c.dim).hover((s) => s.bg(c.surface).text_color(c.foreground))
    .on_mouse_down("left", stop).on_click(action).child(icon);
  const winIcon = (name, fallback) => (w?.platform === "windows" ? svg(`mods/tabs/${name}.svg`).size(16) : fallback);

  return h_flex().id("ph-tabs").size_full().min_w(0).pl(lightsPadding).pr(10).gap(6).items_center().bg(c.chrome)
    .font_family(FONT_UI).text_size(15)
    .on_mouse_up("left", () => { self.pressed = null; })
    .on_scroll_wheel((e) => { if (Math.abs(e.delta.y) >= 1) run(e.delta.y > 0 ? "tab.prev" : "tab.next"); })
    .child(h_flex().id("ph-tab-scroll").flex_1().min_w(0).h_full().items_center().gap(6).overflow_x_scrollbar()
      .children(shown.map((t) => tabItem(self, t, views.get(t.id), space, c)))
      .child(square("ph-tab-new", false, c, "+", "New tab", () => openOverlay({ mod: "new-menu", kind: "popup", width: 250, height: 512 }))))
    .when(enabled.includes("files"), (el) => el.child(panelButton("files", "Files")))
    .when(enabled.includes("changes"), (el) => el.child(panelButton("changes", "Changes")))
    .when(Boolean(w?.buttons), (el) => el
      .child(winButton("ph-minimize", winIcon("win-min", "−"), () => run("window.minimize")))
      .child(winButton("ph-maximize", winIcon(w.maximized ? "win-restore" : "win-max", "□"), () => run("window.maximize")))
      .child(winButton("ph-close-window", winIcon("win-close", svg("mods/pane/close.svg").size(13)), () => run("window.close"))));
}

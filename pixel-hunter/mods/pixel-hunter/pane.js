// A pane's header (30 px, one copy per pane; props().pane from Herdr). For a Hunter: its 24 px
// face, Class, Rank (grade tag and model, or its program), folder · branch, and its state on the
// right. For a shell: the program's icon and name, folder · branch. For a mod pane: its title.
// Click focuses the pane; on hover, split right / down, zoom and close appear, as in Herdr's
// shipped `pane` header.
//
// The frame: Herdr draws every pane's 2 px frame (the layout's pane.border, `border`, and
// pane.focus, `accent` mint, on the focused one), and a layout can't color one pane by its
// agent's status. So a pane whose Hunter Needs help (paneFrame in hunt.js, peach wins over
// focus) shows it here: the header gets a 2 px peach frame on a peach tint, like the Hunter's
// sidebar row, focused or not. A focused pane that Needs help keeps Herdr's mint outer frame.
import { div, svg, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { props, run, panes } from "herdr";
import { colors, FONT_UI, FRAME } from "./theme.js";
import { world } from "./world.js";
import { smallFace, gradeBadge, stateColor, stateText, plain, SMALL_FACE } from "./areas.js";
import { startSessions } from "./sessions.js";

export function paneInit(self, cx) {
  self.hovered = false;
  startSessions(self, cx); // Rank comes from the statusLine records, like the sidebar's
}

function programIcon(program, c) {
  if (!program?.icon) return null;
  return program.tint
    ? svg(program.icon).size(14).flex_none().text_color(c.dim)
    : image(program.icon).w(14).h(14).flex_none();
}

function button(id, icon, c, command, args) {
  return div().id(id).p(3).flex_none().text_color(c.dim)
    .hover((s) => s.bg(c.selected).text_color(c.foreground))
    .on_click((_e, cx) => { cx.stop_propagation(); run(command, args); })
    .child(svg(`mods/pane/${icon}.svg`).size(14));
}

// "~/code/shop-api · feat/login", either part may be missing.
function where(view) {
  return [view.path, view.branch && `⎇ ${view.branch}`].filter(Boolean).map(plain).join(" · ");
}

export function paneHeader(self) {
  const c = colors();
  const id = props()?.pane;
  const model = world(self);
  const view = model.panes.find((p) => p.pane === id);
  if (!view) return div().id("ph-pane-none").size_full().bg(c.surface);
  const h = view.hunter;
  const help = view.frame === "help";
  const info = panes().find((p) => p.pane === id); // Herdr's own: program icon, title, zoomed

  const row = h_flex().id(`ph-pane-${id}`).size_full().min_w(0).pl(3).pr(8).gap(8).items_center()
    .font_family(FONT_UI).text_size(14).text_color(c.foreground)
    .bg(help ? `${c.blocked}1f` : c.surface)
    .border_b(FRAME).border_color(c.border)
    .when(help, (el) => el.border(FRAME).border_color(c.blocked))
    .on_hover((hovered, cx) => { if (self.hovered !== hovered) { self.hovered = hovered; cx.notify(); } })
    .on_click(() => run("pane.focus", { pane: id }));

  const left = h
    ? row
      .child(smallFace(h.cls))
      .child(div().flex_none().font_semibold().child(h.cls.name))
      .child(gradeBadge(h.rank, c))
      .child(div().flex_none().max_w(160).truncate().child(plain(h.rank.label)))
    : row
      .child(div().w(SMALL_FACE).flex_none().flex().items_center().justify_center()
        .when(Boolean(programIcon(info?.program, c)), (el) => el.child(programIcon(info.program, c))))
      .child(div().flex_none().max_w(200).truncate().font_semibold()
        .child(plain(view.terminal ? view.program ?? info?.title ?? "shell" : info?.title ?? "pane")));

  return left
    .child(div().flex_1().min_w(0).truncate().text_color(c.dim).child(where(view)))
    .when(Boolean(info?.zoomed), (el) => el.child(div().flex_none().text_size(13).text_color(c.dim).child("ZOOM")))
    .when(Boolean(h), (el) => el.child(div().flex_none().text_size(13).font_semibold()
      .text_color(stateColor(c, h.state)).child(stateText(h.state).toUpperCase())))
    .when(self.hovered, (el) => el
      .child(button(`ph-pr-${id}`, "split-right", c, "pane.split", { direction: "right", pane: id }))
      .child(button(`ph-pd-${id}`, "split-down", c, "pane.split", { direction: "down", pane: id }))
      .child(button(`ph-pz-${id}`, info?.zoomed ? "unzoom" : "zoom", c, "pane.zoom", { pane: id }))
      .child(button(`ph-px-${id}`, "close", c, "pane.close", { pane: id })));
}

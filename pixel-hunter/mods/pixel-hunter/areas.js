// The Area list: every space as an Area (its face beside three lines), its Hunters underneath.
// Area head: click selects the space, right-click opens its menu, drag reorders. Its chevron
// (▾ open, ▸ closed) shows or hides the Hunters and keeps the press, so it never selects.
// Hunter row: click focuses its agent.
import { div, image, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { run, openOverlay } from "herdr";
import { STATES, HP_MAX } from "./hunt.js";
import { FRAME } from "./theme.js";
import { toggleExpanded } from "./world.js";

const ART = "mods/pixel-hunter/art";
export const monsterFace = (m) => `${ART}/boss/${m.id}/Faceset.png`;
// The 4x copy (tools/build-art.py), for drawing a face at 2x without GPUI's smoothing.
export const monsterFaceX4 = (m) => `${ART}/x4/boss/${m.id}/Faceset.png`;
export const hunterFace = (cls) => `${ART}/chars/${cls.sprite}/Faceset.png`;

// A 38 px faceset cropped into a framed box: `x`, `y` move the image inside the frame.
function face(path, size, x, y, c) {
  return div().relative().w(size).h(size).flex_none().overflow_hidden()
    .border(FRAME).border_color(c.border).bg(c.canvas)
    .child(image(path).absolute().left(x).top(y).w(38).h(38));
}

// A Hunter's face for the tab bar and pane headers: the 38 px faceset at 1:1, cropped to its
// middle 24 px (as in the preview record: 7 px in, 5 px down), no frame.
export const SMALL_FACE = 24;
export function smallFace(cls) {
  return div().relative().w(SMALL_FACE).h(SMALL_FACE).flex_none().overflow_hidden()
    .child(image(hunterFace(cls)).absolute().left(-7).top(-5).w(38).h(38));
}

// The Monster's face in an Area row: the 38 px faceset at 2x (76 px, twice a Hunter
// face), spanning all three lines. The frame covers its outer art pixel all round.
export const MONSTER_FACE = 76;
function monsterFaceBox(m, c) {
  return div().relative().w(MONSTER_FACE).h(MONSTER_FACE).flex_none().overflow_hidden()
    .border(FRAME).border_color(c.border).bg(c.canvas)
    .child(image(monsterFaceX4(m)).absolute().left(-FRAME).top(-FRAME).w(MONSTER_FACE).h(MONSTER_FACE));
}

// Pixelify Sans draws its fi/fl ligatures like an "A" ("fix" reads "Ax"): a zero-width
// non-joiner after each f keeps the letters apart. For every name, path and branch shown.
export const plain = (text) => String(text ?? "").replace(/f(?=[filt])/g, "f\u200c");

// The Monster's HP bar, drawn in the arena only (the Area row leaves it out) from `area.hp`:
// a 2 px framed groove on canvas with an `hp` fill. A change
// (wear on each redraw, the drain when Slain, the refill on Respawn) slides in HP_SLIDE_MS.
export const HP_SLIDE_MS = 600;
export function hpBar(key, area, width, c) {
  const inner = width - 2 * FRAME;
  const fill = Math.max(0, Math.min(inner, Math.round((inner * area.hp) / HP_MAX)));
  return div().relative().flex_none().w(width).h(8 + 2 * FRAME).border(FRAME).border_color(c.border).bg(c.canvas)
    .child(div().id(`ph-hp-${key}-${area.id}`).absolute().left(0).top(0).h(8).w(fill).bg(c.hp)
      .transition("width", { duration: HP_SLIDE_MS, easing: "linear" }));
}

export const stateColor = (c, state) => c[STATES[state]?.color] ?? c.dim;
export const stateText = (state) => `${STATES[state].icon} ${STATES[state].label}`;

function areaHead(self, area, model, c) {
  const drag = self.drag ?? (self.drag = { pressed: null, over: null });
  const from = model.areas.findIndex((a) => a.id === drag.pressed);
  const dragging = drag.pressed !== null;
  return v_flex().id(`ph-area-${area.id}`).relative().cursor_pointer()
    .when(dragging && drag.pressed === area.id && drag.over !== area.id, (el) => el.opacity(0.5))
    .when(dragging && drag.over === area.id && drag.pressed !== area.id, (el) => el.child(
      div().absolute().left(-10).right(-10).h(FRAME).bg(c.accent)
        .when(from < area.index, (l) => l.bottom(-4))
        .when(from > area.index, (l) => l.top(-8))))
    .on_mouse_down("left", () => { drag.pressed = area.id; drag.over = area.id; })
    .on_mouse_move((_e, cx) => {
      if (drag.pressed !== null && drag.over !== area.id) { drag.over = area.id; cx.notify(); }
    })
    .on_mouse_up("left", (_e, cx) => {
      const { pressed, over } = drag;
      drag.pressed = null; drag.over = null;
      if (pressed !== null && over === area.id && pressed !== area.id) run("space.move", { id: pressed, index: area.index + 1 });
      else if (pressed === area.id) run("space.select", { id: area.id });
      cx.notify();
    })
    .on_mouse_down("right", () => openOverlay({ mod: "menu", kind: "popup", width: 200, height: 260, props: { tab: "space", target: { id: area.id } } }))
    .child(h_flex().gap(8).items_center()
      .child(chevron(self, area, c))
      .child(monsterFaceBox(area.monster, c))
      // three lines, each a third of the face's height (as the record's grid rows): name with
      // the worst-state dot and ⌃N, then path, then branch (empty outside git). The map name
      // and HP live in the arena only.
      .child(v_flex().flex_1().min_w(0).h(MONSTER_FACE)
        .child(areaLine().gap(8)
          .child(div().min_w(0).flex_1().truncate().font_semibold().text_color(c.foreground).child(plain(area.name)))
          .child(div().size(8).flex_none().bg(area.worst ? stateColor(c, area.worst) : c.dim))
          .when(Boolean(area.key), (el) => el.child(div().flex_none().text_size(13).text_color(c.dim).child(area.key))))
        .child(areaLine().text_size(13).text_color(c.dim)
          .child(div().min_w(0).truncate().child(plain(area.path))))
        .child(areaLine().text_size(13).text_color(c.foreground)
          .when(Boolean(area.branch), (el) => el.child(div().min_w(0).truncate().child(`⎇ ${plain(area.branch)}`))))));
}

const areaLine = () => h_flex().flex_1().min_w(0).items_center();

// ▾ / ▸ (pixel icons: Pixelify Sans has no such glyphs) in the Area's 10 px left column, the column's full height so it's easy to hit. It
// stops its own press and release, so the head neither selects the space nor starts a drag;
// a release here after a press elsewhere (a drag) passes on, so dropping on it still moves.
// Held open by Needs help it can't close (dim, with a tooltip saying why).
function chevron(self, area, c) {
  return div().id(`ph-chev-${area.id}`).w(10).h(MONSTER_FACE).flex_none().flex().items_center()
    .text_color(c.dim)
    .when(!area.held, (el) => el.cursor_pointer().hover((s) => s.text_color(c.foreground)))
    .when(area.held, (el) => el.opacity(0.5).tooltip("Needs help keeps this Area open"))
    .on_mouse_down("left", (_e, cx) => { cx.stop_propagation(); self.chevPressed = area.id; })
    .on_mouse_up("left", (_e, cx) => {
      if (self.chevPressed !== area.id) return;
      cx.stop_propagation();
      self.chevPressed = null;
      toggleExpanded(area);
    })
    .child(svg(`mods/pixel-hunter/icons/chevron-${area.expanded ? "open" : "closed"}.svg`).size(10).flex_none());
}

// A Hunter row, layout F of docs/records/2026-11-05-hunter-row.html: a 4 px strip in the state
// colour down the left edge, the 38 px face, and two lines:
//   1. the name (its tab's), then dim the Class, the program when it isn't Claude Code and the
//      branch when it differs from the Area's; the state's icon on the right
//   2. the Rank grade and model; on the right the used/total tokens and the Stamina bar
// Needs help keeps the peach frame. The strip spans the whole row, so a later Pet icon line
// (ticket 05) goes under the face and lines, inside `body`, and the strip grows with it.
export const STRIP_W = 4;
function hunterRow(h, c) {
  const help = h.state === "help";
  const extra = [h.cls.name, h.programLabel, h.branch ? `⎇ ${h.branch}` : null].filter(Boolean).join(" · ");
  const body = v_flex().flex_1().min_w(0)
    .child(h_flex().gap(8).items_center()
      .child(face(hunterFace(h.cls), 38, 0, 0, c))
      .child(v_flex().flex_1().min_w(0).gap(1)
        .child(h_flex().min_w(0).gap(6).items_center()
          .child(div().min_w(0).truncate().font_semibold().text_color(c.foreground).child(plain(h.name)))
          .child(div().flex_1().min_w(0).truncate().text_size(13).text_color(c.dim).child(plain(extra)))
          .child(div().id(`ph-st-${h.terminal}`).flex_none().text_size(13).font_semibold().text_color(stateColor(c, h.state))
            .tooltip(STATES[h.state].label).child(STATES[h.state].icon)))
        .child(h_flex().min_w(0).gap(6).items_center().text_size(13).text_color(c.dim)
          .child(gradeBadge(h.rank, c))
          .child(div().flex_1().min_w(0).truncate().child(plain(h.rank.label)))
          .child(h_flex().flex_none().gap(4).items_center()
            .when(h.tokens != null, (el) => el.child(div().flex_none().text_size(12).child(h.tokens?.text ?? "")))
            .child(staminaView(h.stamina, c))))));
  return h_flex().id(`ph-hunter-${h.terminal}`).ml(16).mt(5).pr(6).py(4).gap(8).items_stretch().cursor_pointer()
    .border(FRAME).border_color(help ? c.blocked : "#00000000")
    .when(help, (el) => el.bg(`${c.blocked}12`))
    .when(!help, (el) => el.hover((s) => s.bg(c.surface)))
    .on_click(() => run("agent.focus", { terminal: h.terminal }))
    .child(div().w(STRIP_W).flex_none().bg(stateColor(c, h.state)))
    .child(body);
}

// Rank's letter grade as a small mint tag ("A"), dim for "?".
export function gradeBadge(rank, c) {
  return div().flex_none().px(4).py(1).text_size(12).font_semibold().text_color(c.canvas)
    .bg(rank.grade === "?" ? c.dim : c.accent).child(plain(rank.grade));
}

// Stamina as a 44 px bar (what's left): blue (working) from 50%, cream (foreground) from 20%, peach
// (blocked) below, never blinking. "STA —" with no data; a stale record is drawn dim with "old".
export const STAMINA_W = 44;
const STAMINA_COLOR = { high: "working", mid: "foreground", low: "blocked" };
export function staminaView(st, c) {
  if (st.percent == null) return div().flex_none().text_color(c.dim).child("STA —");
  const inner = STAMINA_W - 2 * FRAME;
  const fill = Math.max(0, Math.min(inner, Math.round((inner * st.percent) / 100)));
  return h_flex().flex_none().gap(4).items_center()
    .when(st.stale, (el) => el.child(div().text_size(12).text_color(c.dim).child("old")))
    .child(div().relative().w(STAMINA_W).h(8 + 2 * FRAME).border(FRAME).border_color(c.border).bg(c.canvas)
      .child(div().absolute().left(0).top(0).h(8).w(fill).bg(st.stale ? c.dim : c[STAMINA_COLOR[st.level]])));
}

export function areaList(self, model, c) {
  return v_flex().id("ph-areas").flex_1().min_h(0).overflow_y_scrollbar()
    .on_mouse_up("left", (_e, cx) => {
      self.chevPressed = null;
      if (self.drag?.pressed) { self.drag.pressed = null; self.drag.over = null; cx.notify(); }
    })
    .children(model.areas.map((area) =>
      v_flex().id(`ph-areabox-${area.id}`).flex_none().pt(8).px(10).pb(10).border_b(FRAME).border_color(c.border)
        .when(area.current, (el) => el.bg(c.selected))
        .child(areaHead(self, area, model, c))
        .when(area.expanded, (el) => el.children(area.hunters.map((h) => hunterRow(h, c))))));
}

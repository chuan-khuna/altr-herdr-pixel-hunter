// The Area list: every space as an Area (two lines), its Hunters underneath.
// Area head: click selects the space, right-click opens its menu, drag reorders.
// Hunter row: click focuses its agent.
import { div, image } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { run, openOverlay } from "herdr";
import { STATES } from "./hunt.js";
import { FRAME } from "./theme.js";

const ART = "mods/pixel-hunter/art";
export const monsterFace = (m) => `${ART}/boss/${m.id}/Faceset.png`;
export const hunterFace = (cls) => `${ART}/chars/${cls.sprite}/Faceset.png`;

// A 38 px faceset cropped into a framed box: `x`, `y` move the image inside the frame.
function face(path, size, x, y, c) {
  return div().relative().w(size).h(size).flex_none().overflow_hidden()
    .border(FRAME).border_color(c.border).bg(c.canvas)
    .child(image(path).absolute().left(x).top(y).w(38).h(38));
}

// Pixelify Sans draws its fi/fl ligatures like an "A" ("fix" reads "Ax"): a zero-width
// non-joiner after each f keeps the letters apart. For every name, path and branch shown.
export const plain = (text) => String(text ?? "").replace(/f(?=[filt])/g, "f\u200c");

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
      .child(div().w(10).flex_none()) // the expand chevron's place (ticket 08)
      .child(face(monsterFace(area.monster), 20, -9, -6, c))
      .child(div().min_w(0).flex_shrink(1).truncate().font_semibold().text_color(c.foreground).child(plain(area.name)))
      .child(div().flex_none().text_color(c.dim).child(`· ${area.map.name}`))
      .child(div().flex_1())
      .child(div().size(8).flex_none().bg(area.worst ? stateColor(c, area.worst) : c.border))
      .when(Boolean(area.key), (el) => el.child(div().flex_none().text_size(13).text_color(c.dim).child(area.key))))
    .child(h_flex().ml(18).mt(1).min_w(0).text_size(13).text_color(c.dim)
      .child(div().flex_none().child(plain(area.path)))
      .when(Boolean(area.branch), (el) => el
        .child(div().flex_none().child(" · "))
        .child(div().min_w(0).truncate().text_color(c.foreground).child(plain(area.branch)))));
}

function hunterRow(h, c) {
  const help = h.state === "help";
  return h_flex().id(`ph-hunter-${h.terminal}`).ml(16).mt(5).px(6).py(4).gap(8).items_center().cursor_pointer()
    .border(FRAME).border_color(help ? c.blocked : "#00000000")
    .when(help, (el) => el.bg(`${c.blocked}12`))
    .when(!help, (el) => el.hover((s) => s.bg(c.surface)))
    .on_click(() => run("agent.focus", { terminal: h.terminal }))
    .child(face(hunterFace(h.cls), 38, 0, 0, c))
    .child(v_flex().flex_1().min_w(0).gap(1)
      .child(h_flex().gap(8).items_center()
        .child(div().flex_none().font_semibold().text_color(c.foreground).child(h.cls.name))
        .child(div().flex_none().text_size(13).font_semibold().text_color(stateColor(c, h.state)).child(stateText(h.state).toUpperCase())))
      .child(h_flex().min_w(0).text_size(13.5).text_color(c.dim)
        .child(div().flex_none().child(plain(h.program)))
        .when(Boolean(h.branch), (el) => el.child(div().min_w(0).truncate().child(` · ⎇ ${plain(h.branch)}`)))));
}

export function areaList(self, model, c) {
  return v_flex().id("ph-areas").flex_1().min_h(0).overflow_y_scrollbar()
    .on_mouse_up("left", (_e, cx) => { if (self.drag?.pressed) { self.drag.pressed = null; self.drag.over = null; cx.notify(); } })
    .children(model.areas.map((area) =>
      v_flex().id(`ph-areabox-${area.id}`).flex_none().pt(8).px(10).pb(10).border_b(FRAME).border_color(c.border)
        .when(area.current, (el) => el.bg(c.selected))
        .child(areaHead(self, area, model, c))
        .children(area.hunters.map((h) => hunterRow(h, c)))));
}

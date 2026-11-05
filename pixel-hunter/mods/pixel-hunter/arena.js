// The arena: a top-down scene of the current Area's map at the top of the sidebar.
// The background is 160x96 art px shown at 2x; the Monster stands on the right playing
// its Idle strip, aligned by its feet; up to four Hunters stand on the left facing it.
//
// Everything moves natively (opacity/top loops, `top` transitions, text frames) and only
// while the Party has someone Hunting or Needing help. With everyone Resting or Cleared,
// the scene is drawn still and schedules nothing; a Cleared hop is two one-shot timers.
//
// Sprites come from art/x4/ (4x nearest-neighbour copies made by tools/build-art.py):
// GPUI smooths scaled images, so a 4x file drawn at 2x keeps every art pixel square.
import { div, image } from "gpui-kit";
import { FRAME } from "./theme.js";
import { plain } from "./areas.js";

const X4 = "mods/pixel-hunter/art/x4";
export const ARENA_VERSION = 1; // bump with tools/build-art.py: Herdr caches images by name
const S = 2; // art px -> logical px
export const ARENA_W = 160 * S;
export const ARENA_H = 96 * S;

// Monster Idle strips: square frames of `size` art px, `feet` = the lowest opaque row.
const MONSTER_ART = {
  GiantRacoon: { file: "Idle.png", size: 60, frames: 6, feet: 55 },
  DemonCyclop: { file: "Idle.png", size: 50, frames: 5, feet: 43 },
  GiantSpirit: { file: "Idle.png", size: 50, frames: 5, feet: 48 },
  TenguBlue: { file: "Idle.png", size: 68, frames: 6, feet: 51 },
  GiantRedSamurai: { file: "Idle.png", size: 48, frames: 12, feet: 44 },
  GiantFrog: { file: "Idle40x40.png", size: 40, frames: 5, feet: 33 },
};
const MONSTER_FEET = { x: 236, y: 128 }; // logical px in the arena
const MONSTER_FRAME_MS = 160;

// Hunter slots (top-left of a 32 px sprite), most urgent first.
const SLOTS = [[44, 52], [92, 70], [40, 104], [88, 122]];
const HUNTER = 16; // art px
const RIGHT = 3; // the pack's direction columns: down, up, left, right
const LUNGE = 6;
const SWAP_MS = 1040; // Idle and Attack, 520 ms each
const HOP = 12;
const HOP_MS = 180;

// A square wave from a linear loop: opacity far outside 0..1 is clamped, so the element
// is fully shown while the loop's there-and-back phase t (0..1..0) is past `at`, and
// hidden otherwise. `before` is the opposite. Loops started in one render share a phase.
const EDGE = 1000;
const after = (at, period) => ({ from: -EDGE * at, to: EDGE * (1 - at), period, easing: "linear" });
const before = (at, period) => ({ from: EDGE * at, to: EDGE * (at - 1), period, easing: "linear" });

/** One frame of a strip of `n` frames `fw` x `fh` art px, drawn at 2x. */
function frame(path, fw, fh, n, col) {
  return div().relative().w(fw * S).h(fh * S).overflow_hidden()
    .child(image(path).absolute().left(-col * fw * S).top(0).w(fw * n * S).h(fh * S));
}

const hunterArt = (h, file) => `${X4}/chars/${h.cls.sprite}/${file}.png`;

// The Monster: a still first frame when calm; while active, its frames take turns (there
// and back) through nested band loops, one frame shown at a time.
function monster(area, active) {
  const m = MONSTER_ART[area.monster.id];
  if (!m) return null;
  const path = `${X4}/boss/${area.monster.id}/${m.file}`;
  const box = div().id(`ph-arena-monster-${area.monster.id}`).absolute()
    .left(MONSTER_FEET.x - (m.size * S) / 2).top(MONSTER_FEET.y - m.feet * S)
    .w(m.size * S).h(m.size * S);
  if (!active) return box.child(frame(path, m.size, m.size, m.frames, 0));
  const period = 2 * m.frames * MONSTER_FRAME_MS;
  return box.children(Array.from({ length: m.frames }, (_, k) => {
    let el = frame(path, m.size, m.size, m.frames, k);
    if (k < m.frames - 1) el = div().id(`ph-arena-mf-${k}-b`).loop("opacity", before((k + 1) / m.frames, period)).child(el);
    if (k > 0) el = div().id(`ph-arena-mf-${k}-a`).loop("opacity", after(k / m.frames, period)).child(el);
    return div().absolute().left(0).top(0).child(el);
  }));
}

// A Hunter in its slot, facing right, animated by its hunt state.
function hunter(self, h, [x, y], active, c) {
  const phase = self.hop?.phase[h.terminal];
  const idle = frame(hunterArt(h, "Idle"), HUNTER, HUNTER, 4, RIGHT);
  const box = div().id(`ph-arena-h-${h.terminal}`).absolute().left(x).top(y).w(HUNTER * S).h(HUNTER * S);
  if (h.state === "hunting") {
    return box
      .child(div().id(`ph-arena-hi-${h.terminal}`).absolute().left(0).top(0)
        .loop("opacity", before(0.5, SWAP_MS)).child(idle))
      .child(div().id(`ph-arena-ha-${h.terminal}`).absolute().left(LUNGE).top(0)
        .loop("opacity", after(0.5, SWAP_MS)).child(frame(hunterArt(h, "Attack"), HUNTER, HUNTER, 4, RIGHT)));
  }
  if (h.state === "help") {
    return box
      .child(frame(hunterArt(h, "Item"), HUNTER, HUNTER, 1, 0))
      .child(div().absolute().left(0).w(HUNTER * S).top(-24).flex().justify_center()
        .text_size(20).font_semibold().text_color(c.blocked)
        .frames(["!", " "], 400));
  }
  if (h.state === "cleared") {
    return box.child(div().id(`ph-arena-hop-${h.terminal}`).absolute().left(0)
      .top(phase === "up" ? -HOP : 0)
      .transition("top", { duration: HOP_MS, easing: phase === "up" ? "ease-out" : "ease-in" })
      .child(phase ? frame(hunterArt(h, "Jump"), HUNTER, HUNTER, 4, RIGHT) : idle));
  }
  // resting: a "z" that floats while the arena is awake, and holds still when it's calm
  let z = div().id(`ph-arena-z-${h.terminal}`).absolute().left(HUNTER * S - 2).top(-14)
    .text_size(14).font_semibold().text_color(c.dim).child("z");
  if (active) z = z.loop("top", { from: -8, to: -20, period: 2400 }).loop("opacity", { from: 1, to: 0.2, period: 2400 });
  return box.child(idle).child(z);
}

// Cleared Hunters hop once when they turn Cleared (not ones already Cleared at start):
// up, then down, then back to Idle, on two one-shot timers.
function hops(self, model, cx) {
  const hop = (self.hop ??= { seen: null, phase: {} });
  const now = new Map(model.areas.flatMap((a) => a.hunters.map((h) => [h.terminal, h.state])));
  if (hop.seen) {
    for (const [t, state] of now) {
      const was = hop.seen.get(t);
      if (state !== "cleared" || !was || was === "cleared" || hop.phase[t]) continue;
      hop.phase[t] = "up";
      cx.timer.after(HOP_MS + 20, (cx) => {
        hop.phase[t] = "down";
        cx.notify();
        cx.timer.after(HOP_MS + 20, (cx) => { delete hop.phase[t]; cx.notify(); });
      });
    }
  }
  for (const t of Object.keys(hop.phase)) if (now.get(t) !== "cleared") delete hop.phase[t];
  hop.seen = now;
}

const label = (text, c) => div().absolute().px(6).text_size(12).text_color(c.foreground).bg(`${c.canvas}cc`).child(text);

/** The arena for the current Area (the first one if none is current); null with no Areas. */
export function arena(self, model, c, cx) {
  if (cx) hops(self, model, cx);
  const area = model.areas.find((a) => a.current) ?? model.areas[0];
  if (!area) return null;
  const active = area.hunters.some((h) => h.state === "hunting" || h.state === "help");
  const { hunters, more } = area.arena;
  const beast = monster(area, active);
  return div().id("ph-arena").flex().flex_none().w_full().h(ARENA_H + FRAME).justify_center().overflow_hidden()
    .bg(c.canvas).border_b(FRAME).border_color(c.border)
    .child(div().id(`ph-arena-${area.map.id}`).relative().flex_none().w(ARENA_W).h(ARENA_H)
      .child(image(`${X4}/arena/${area.map.id}-v${ARENA_VERSION}.png`).absolute().left(0).top(0).w(ARENA_W).h(ARENA_H))
      .when(beast != null, (el) => el.child(beast))
      .children(hunters.map((h, i) => hunter(self, h, SLOTS[i], active, c)))
      .child(label(plain(`${area.map.name} · ${area.monster.name}`), c).left(10).bottom(6))
      .when(more > 0, (el) => el.child(label(`+${more}`, c).left(10).top(8))));
}

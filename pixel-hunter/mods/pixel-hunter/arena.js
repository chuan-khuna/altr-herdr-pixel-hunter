// The arena: a top-down scene of the current Area's map at the top of the sidebar.
// The background is 160x96 art px shown at 2x; the Monster stands on the right playing
// its Idle strip, aligned by its feet; up to four Hunters stand on the left facing it, each
// with up to two of its Pets at its feet.
//
// Everything moves natively (opacity/top/left loops, `top`/`opacity`/`width` transitions,
// text frames) and only while the Party (Hunters and their Pets) has someone Hunting or
// Needing help; the one
// exception is the Monster's fall when it's Slain, a single one-shot transition. With everyone Resting or Cleared,
// the scene is drawn still and schedules nothing; a Cleared hop is two one-shot timers.
//
// Sprites come from art/x4/ (4x nearest-neighbour copies made by tools/build-art.py):
// GPUI smooths scaled images, so a 4x file drawn at 2x keeps every art pixel square.
import { div, image } from "gpui-kit";
import { FRAME } from "./theme.js";
import { plain, hpBar } from "./areas.js";

const X4 = "mods/pixel-hunter/art/x4";
export const ARENA_VERSION = 1; // bump with tools/build-art.py: Herdr caches images by name
const S = 2; // art px -> logical px
export const ARENA_W = 160 * S;
export const ARENA_H = 96 * S;

// Monster strips: frames `w` x `size` art px (`w` defaults to `size`; the samurai's are
// 96 x 48, swords out to the sides), `feet` = just below the lowest opaque
// row. `hit` plays once every ATTACK_MS while the Party Hunts (Racoon has no Hit strip:
// its Attack plays).
const MONSTER_ART = {
  GiantRacoon: { file: "Idle.png", size: 60, frames: 6, feet: 55, hit: { file: "Attack.png", frames: 4, feet: 60 } },
  DemonCyclop: { file: "Idle.png", size: 50, frames: 5, feet: 43, hit: { file: "Hit.png", frames: 3, feet: 43 } },
  GiantSpirit: { file: "Idle.png", size: 50, frames: 5, feet: 48, hit: { file: "Hit.png", frames: 3, feet: 48 } },
  TenguBlue: { file: "Idle.png", size: 68, frames: 6, feet: 51, hit: { file: "Hit.png", frames: 8, feet: 60 } },
  GiantRedSamurai: { file: "Idle.png", w: 96, size: 48, frames: 6, feet: 44, hit: { file: "Hit.png", frames: 4, feet: 46 } },
  GiantFrog: { file: "Idle40x40.png", size: 40, frames: 5, feet: 33, hit: { file: "Hit.png", frames: 3, feet: 33 } },
};
const MONSTER_FEET = { x: 236, y: 128 }; // logical px in the arena
const MONSTER_FRAME_MS = 160;
const HIT_FRAME_MS = 90;
const ATTACK_MS = 5000; // one Hit play (2 x frames x HIT_FRAME_MS) per ATTACK_MS while Hunting
const SHAKE = 2; // px either way, there and back every SHAKE_MS, during the Hit play only
const SHAKE_MS = 300;
// Slain: the Monster drops FALL px and fades to SLAIN_OPACITY in one native transition.
const FALL = 14;
const SLAIN_OPACITY = 0.35;
const FALL_MS = 600;
const HP_W = 110;

// Hunter slots (top-left of a 32 px sprite), most urgent first.
const SLOTS = [[44, 52], [92, 70], [40, 104], [88, 122]];
const HUNTER = 16; // art px
const RIGHT = 3; // the pack's direction columns: down, up, left, right
const LUNGE = 6;
const SWAP_MS = 1040; // Idle and Attack, 520 ms each
const HOP = 12;
const HOP_MS = 180;

// Pets (the Hunter's pets.shown, at most 2): 16 px animals at 2x in a row at their Hunter's
// feet, top-left of each from the Hunter's slot, drawn in front of it. Each sprite sheet is two
// frames (stand, leap); a Hunting Pet swaps them, one that Needs help stands under a blinking
// "!". The [+N] for the rest goes left of the pair on the left column and right of it on the
// right one, which keeps it off the next Hunter, the caption and the Monster.
const PET = 16; // art px
const PET_AT = [[-16, 20], [16, 20]];
const PET_MORE_AT = [[-38, 36], [46, 36], [-38, 36], [46, 36]]; // per slot
const PET_SWAP_MS = 640; // the two frames, 320 ms each

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

// A strip's frames taking turns (there and back) through nested band loops, one at a time:
// frame k shows while the loop's phase is in the k-th of n equal bands of `lo`..1 (below
// `lo` frame 0 shows; the caller hides the strip there when `lo` > 0).
function strip(path, w, size, n, period, tag, lo = 0) {
  const band = (k) => lo + (k * (1 - lo)) / n;
  return Array.from({ length: n }, (_, k) => {
    let el = frame(path, w, size, n, k);
    if (k < n - 1) el = div().id(`ph-arena-${tag}-${k}-b`).loop("opacity", before(band(k + 1), period)).child(el);
    if (k > 0) el = div().id(`ph-arena-${tag}-${k}-a`).loop("opacity", after(band(k), period)).child(el);
    return div().absolute().left(0).top(0).child(el);
  });
}

// Hunting: the Idle strip, and once every ATTACK_MS the Hit strip played once through, there
// and back, shaking. One ATTACK_MS loop drives both: its phase t runs 0..1..0; the Hit strip
// shows while t is past `at` (a play centred on the turn at t = 1) and its frames are the
// bands of at..1, so t rising then falling plays them 0..n-1..0 at HIT_FRAME_MS each. The
// Idle strip shows the rest of the time. Each strip stands on its own `feet`.
function attacks(m, dir, w, id) {
  const play = 2 * m.hit.frames * HIT_FRAME_MS;
  const at = 1 - play / ATTACK_MS;
  const idle = strip(`${dir}/${m.file}`, w, m.size, m.frames, 2 * m.frames * MONSTER_FRAME_MS, "mi");
  const hit = strip(`${dir}/${m.hit.file}`, w, m.size, m.hit.frames, ATTACK_MS, "mh", at);
  return div().absolute().left(0).top(0).size_full()
    .child(div().id(`ph-arena-mrest-${id}`).absolute().left(0).top(0).size_full()
      .loop("opacity", before(at, ATTACK_MS)).children(idle))
    .child(div().id(`ph-arena-mhit-${id}`).absolute().left(0).top((m.feet - m.hit.feet) * S).size_full()
      .loop("opacity", after(at, ATTACK_MS))
      .child(div().id(`ph-arena-mshake-${id}`).absolute().left(0).top(0).size_full()
        .loop("left", { from: -SHAKE, to: SHAKE, period: SHAKE_MS, easing: "linear" })
        .children(hit)));
}

// The Monster by `area.mode`:
// - hit (someone Hunting): its Idle strip, with one shaking Hit play every ATTACK_MS;
// - idle: its Idle strip while the arena is awake (someone Needs help), a still first frame when calm;
// - slain: the still first frame, dropped FALL px and faded. The drop and fade are a one-shot
//   native transition on `ph-arena-mbody-*`, which keeps its id across modes, so it plays
//   when the Monster falls. A Respawn brings a different Monster (new ids), which just stands
//   there at full height; a Monster already Slain when the
//   arena first draws just lies there. Nothing moves afterwards.
function monster(area, active) {
  const m = MONSTER_ART[area.monster.id];
  if (!m) return null;
  const dir = `${X4}/boss/${area.monster.id}`;
  const hit = area.mode === "hit" && m.hit;
  const slain = area.mode === "slain";
  const w = m.w ?? m.size;
  const box = div().id(`ph-arena-monster-${area.monster.id}`).absolute()
    .left(MONSTER_FEET.x - (w * S) / 2).top(MONSTER_FEET.y - m.feet * S)
    .w(w * S).h(m.size * S);
  let body;
  if (hit) {
    body = attacks(m, dir, w, area.monster.id);
  } else if (active && !slain) {
    body = div().absolute().left(0).top(0).size_full()
      .children(strip(`${dir}/${m.file}`, w, m.size, m.frames, 2 * m.frames * MONSTER_FRAME_MS, "mi"));
  } else {
    body = frame(`${dir}/${m.file}`, w, m.size, m.frames, 0);
  }
  return box.child(div().id(`ph-arena-mbody-${area.monster.id}`).absolute().left(0).size_full()
    .top(slain ? FALL : 0).opacity(slain ? SLAIN_OPACITY : 1)
    .transition("top", { duration: FALL_MS, easing: "ease-in" })
    .transition("opacity", { duration: FALL_MS, easing: "ease-in" })
    .child(body));
}

// The HP bar, bottom-right: the same bar as the Area row's, with "HP" or "SLAIN" under it.
function hp(area, c) {
  return div().absolute().right(12).bottom(8).w(HP_W).flex().flex_col().items_end().gap(2)
    .child(hpBar("arena", area, HP_W, c))
    .child(div().px(4).text_size(12).text_color(area.mode === "slain" ? c.foreground : c.dim).bg(`${c.canvas}cc`)
      .child(area.mode === "slain" ? "SLAIN" : "HP"));
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

// A Hunter's Pet at its spot, facing right: Hunting swaps the sheet's two frames natively,
// Needs help holds the first under a blinking "!" (as the Hunter's own "!").
function pet(h, p, [x, y], c) {
  const art = `${X4}/animals/${p.animal}/SpriteSheet.png`;
  const id = `${h.terminal}-${p.agent}`;
  const box = div().id(`ph-arena-p-${id}`).absolute().left(x).top(y).w(PET * S).h(PET * S);
  if (p.state === "help") {
    return box
      .child(frame(art, PET, PET, 2, 0))
      .child(div().absolute().left(0).w(PET * S).top(-14).flex().justify_center()
        .text_size(16).font_semibold().text_color(c.blocked)
        .frames(["!", " "], 400));
  }
  return box
    .child(div().id(`ph-arena-p0-${id}`).absolute().left(0).top(0)
      .loop("opacity", before(0.5, PET_SWAP_MS)).child(frame(art, PET, PET, 2, 0)))
    .child(div().id(`ph-arena-p1-${id}`).absolute().left(0).top(0)
      .loop("opacity", after(0.5, PET_SWAP_MS)).child(frame(art, PET, PET, 2, 1)));
}

// A drawn Hunter's Pets (pets.shown) at its feet, and its [+N] badge or null.
function pets(h, [x, y], slot, c) {
  const sprites = h.pets.shown.map((p, k) => pet(h, p, [x + PET_AT[k][0], y + PET_AT[k][1]], c));
  const [mx, my] = PET_MORE_AT[slot];
  const badge = h.pets.more > 0
    ? div().id(`ph-arena-pm-${h.terminal}`).absolute().left(x + mx).top(y + my).px(2)
      .text_size(10).text_color(c.foreground).bg(`${c.canvas}cc`).child(`[+${h.pets.more}]`)
    : null;
  return { sprites, badge };
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
  const awake = (s) => s === "hunting" || s === "help";
  const active = area.hunters.some((h) => awake(h.state) || h.pets.all.some((p) => awake(p.state)));
  const { hunters, more } = area.arena;
  // Slots go top to bottom, so each Hunter and its Pets stand in front of the slots above;
  // the [+N] badges go on top of everything.
  const party = hunters.map((h, i) => ({ h, i, ...pets(h, SLOTS[i], i, c) }));
  const beast = monster(area, active);
  return div().id("ph-arena").flex().flex_none().w_full().h(ARENA_H + FRAME).justify_center().overflow_hidden()
    .bg(c.canvas).border_b(FRAME).border_color(c.border)
    .child(div().id(`ph-arena-${area.map.id}`).relative().flex_none().w(ARENA_W).h(ARENA_H)
      .child(image(`${X4}/arena/${area.map.id}-v${ARENA_VERSION}.png`).absolute().left(0).top(0).w(ARENA_W).h(ARENA_H))
      .when(beast != null, (el) => el.child(beast))
      .children(party.flatMap(({ h, i, sprites }) => [hunter(self, h, SLOTS[i], active, c), ...sprites]))
      .children(party.map((m) => m.badge).filter(Boolean))
      .child(label(plain(`${area.map.name} · ${area.monster.name}`), c).left(10).bottom(6))
      .child(hp(area, c))
      .when(more > 0, (el) => el.child(label(`+${more}`, c).left(10).top(8))));
}

// The pixel-hunter look. Colors come from theme() so the theme file stays the one source;
// the fallbacks are the pixel-hunter-night values for a theme that lacks a name (hp).
import { theme } from "herdr";

export const FONT_UI = "Pixelify Sans";
export const FONT_LOGO = "Press Start 2P";
export const FRAME = 2; // every frame is 2 px, radius 0

const NIGHT = {
  canvas: "#101a24", chrome: "#15222e", surface: "#192a38", selected: "#1c2f40",
  border: "#2e475b", dim: "#7e9e99", foreground: "#c5ccb8", accent: "#95c5ac",
  working: "#7ca1c0", blocked: "#f3a787", done: "#6eaa78", hp: "#c38890",
};

export function colors() {
  const t = theme();
  const out = {};
  for (const k of Object.keys(NIGHT)) out[k] = t[k] ?? NIGHT[k];
  return { ...t, ...out };
}

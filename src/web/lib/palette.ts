import type { Theme } from "../../shared/validation.js";

// Turning coolors.co palettes (5–10 colors) into a link page theme (4 roles).

export interface Palette {
  name: string;
  colors: string[]; // "#rrggbb"
}

// Snapshot of the top 4 on https://coolors.co/palettes/trending (October 2026).
export const TRENDING_PALETTES: Palette[] = [
  { name: "Fiery Ocean", colors: hexList("780000-c1121f-fdf0d5-003049-669bbc") },
  { name: "Olive Garden Feast", colors: hexList("606c38-283618-fefae0-dda15e-bc6c25") },
  { name: "Pastel Dreamland", colors: hexList("cdb4db-ffc8dd-ffafcc-bde0fe-a2d2ff") },
  { name: "Ocean Sunset", colors: hexList("001219-005f73-0a9396-94d2bd-e9d8a6-ee9b00-ca6702-bb3e03-ae2012-9b2226") },
];

function hexList(dashed: string): string[] {
  return dashed.split("-").map((h) => `#${h.toLowerCase()}`);
}

// Accepts coolors.co links (generator "coolors.co/264653-2a9d8f-…" or "coolors.co/palette/264653-…")
// as well as a bare "264653-2a9d8f-…" list. The colors are part of the URL, so nothing needs to be fetched.
export function parseCoolorsInput(input: string): string[] | null {
  const value = input.trim();
  if (!value) return null;
  let candidate = value;
  if (/^(https?:\/\/)?([a-z0-9-]+\.)*coolors\.co\//i.test(value)) {
    try {
      const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
      candidate = url.pathname.split("/").filter(Boolean).pop() ?? "";
    } catch {
      return null;
    }
  }
  if (!/^([0-9a-f]{6}-)+[0-9a-f]{6}$/i.test(candidate)) return null;
  const colors = hexList(candidate);
  return colors.length >= 2 && colors.length <= 10 ? colors : null;
}

function channels(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// WCAG relative luminance and contrast ratio.
function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

function saturation(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => c / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  return max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
}

const maxBy = <T>(items: T[], score: (item: T) => number): T =>
  items.reduce((best, item) => (score(item) > score(best) ? item : best));

export type Variant = "dark" | "light";

// Background: darkest (or lightest) color. Text: the color that reads best on it.
// Buttons: the most colorful remaining color that stands out from the background.
// White or black is used whenever no palette color is readable enough.
export function themeFromPalette(colors: string[], variant: Variant): Theme {
  const byLuminance = [...colors].sort((a, b) => luminance(a) - luminance(b));
  const background = variant === "dark" ? byLuminance[0]! : byLuminance[byLuminance.length - 1]!;
  const rest = colors.filter((c) => c !== background);

  const readable = (on: string, options: string[]) => {
    const best = maxBy([...options, "#ffffff", "#000000"], (c) => contrast(c, on));
    const fromPalette = options.filter((c) => contrast(c, on) >= 4.5);
    return fromPalette.length ? maxBy(fromPalette, (c) => contrast(c, on)) : best;
  };

  const text = readable(background, rest);
  const buttonCandidates = rest.filter((c) => c !== text);
  const visible = buttonCandidates.filter((c) => contrast(c, background) >= 1.4);
  const button = (visible.length ? maxBy(visible, saturation) : buttonCandidates[0]) ?? text;
  const buttonText = readable(button, colors.filter((c) => c !== button));

  return { background, text, button, buttonText };
}

import { describe, expect, it } from "vitest";
import { contrast, parseCoolorsInput, themeFromPalette, TRENDING_PALETTES } from "../src/web/lib/palette.js";

describe("coolors.co palettes", () => {
  it("parses palette and generator links as well as bare color lists", () => {
    const expected = ["#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"];
    expect(parseCoolorsInput("https://coolors.co/palette/264653-2a9d8f-e9c46a-f4a261-e76f51")).toEqual(expected);
    expect(parseCoolorsInput("https://coolors.co/264653-2a9d8f-e9c46a-f4a261-e76f51")).toEqual(expected);
    expect(parseCoolorsInput("coolors.co/palette/264653-2A9D8F-e9c46a-f4a261-e76f51?ref=x")).toEqual(expected);
    expect(parseCoolorsInput("  264653-2a9d8f-e9c46a-f4a261-e76f51 ")).toEqual(expected);
  });

  it("rejects anything else", () => {
    expect(parseCoolorsInput("")).toBeNull();
    expect(parseCoolorsInput("https://example.com/264653-2a9d8f")).toBeNull();
    expect(parseCoolorsInput("https://coolors.co/palettes/trending")).toBeNull();
    expect(parseCoolorsInput("264653")).toBeNull();
    expect(parseCoolorsInput("zzzzzz-2a9d8f")).toBeNull();
  });

  it("maps every trending palette to a readable theme in both variants", () => {
    for (const { colors } of TRENDING_PALETTES) {
      for (const variant of ["dark", "light"] as const) {
        const theme = themeFromPalette(colors, variant);
        expect(contrast(theme.text, theme.background)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(theme.buttonText, theme.button)).toBeGreaterThanOrEqual(4.5);
        expect(theme.button).not.toBe(theme.background);
      }
    }
  });

  it("uses the darkest color as dark background and the lightest as light background", () => {
    const colors = ["#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"];
    expect(themeFromPalette(colors, "dark").background).toBe("#264653");
    expect(themeFromPalette(colors, "light").background).toBe("#e9c46a");
  });
});

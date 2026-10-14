import { describe, expect, it } from "vitest";
import { contrast, parseCoolorsInput, themeFromPalette } from "../src/web/lib/palette.js";

// A mix of real coolors.co palettes: dark, light, pastel and a 10-color one.
const SAMPLE_PALETTES = [
  "780000-c1121f-fdf0d5-003049-669bbc",
  "606c38-283618-fefae0-dda15e-bc6c25",
  "cdb4db-ffc8dd-ffafcc-bde0fe-a2d2ff",
  "001219-005f73-0a9396-94d2bd-e9d8a6-ee9b00-ca6702-bb3e03-ae2012-9b2226",
].map((p) => parseCoolorsInput(p)!);

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

  it("maps palettes to a readable theme in both variants", () => {
    for (const colors of SAMPLE_PALETTES) {
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

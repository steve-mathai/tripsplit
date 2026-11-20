import { describe, expect, it } from "vitest";
import { hueOf, personTint } from "../../components/person-tint";

describe("hueOf", () => {
  it("reads the hue of pure and mixed colours", () => {
    expect(hueOf("#ff0000")).toBe(0);
    expect(hueOf("#00ff00")).toBe(120);
    expect(hueOf("#0000ff")).toBe(240);
    expect(hueOf("#ffff00")).toBe(60);
    expect(hueOf("#0f766e")).toBe(175);
  });

  it("accepts shorthand, upper case and a missing hash", () => {
    expect(hueOf("#f00")).toBe(0);
    expect(hueOf("00F")).toBe(240);
    expect(hueOf("#0F766E")).toBe(175);
  });

  it("wraps magenta-reds into 0-359", () => {
    // Hue 359.x must round to 0, never 360.
    expect(hueOf("#ff0001")).toBe(0);
    expect(hueOf("#ff0080")).toBe(330);
  });

  it("gives 0 for greys and for text that is not a colour", () => {
    expect(hueOf("#808080")).toBe(0);
    expect(hueOf("not a colour")).toBe(0);
    expect(hueOf("")).toBe(0);
  });
});

describe("personTint", () => {
  it("derives the light and dark tint and ink from the hue", () => {
    const tint = personTint("#0f766e");
    expect(tint.hue).toBe(175);
    expect(tint.light).toEqual({ bg: "hsl(175 70% 92%)", ink: "hsl(175 60% 26%)" });
    expect(tint.dark).toEqual({ bg: "hsl(175 30% 20%)", ink: "hsl(175 70% 80%)" });
  });

  it("exposes the hue as --p-h so CSS can switch theme without JS", () => {
    expect(personTint("#0000ff").style).toEqual({ "--p-h": 240 });
  });

  it("gives the same tint for the same colour and different tints for different hues", () => {
    expect(personTint("#9e1a60")).toEqual(personTint("#9e1a60"));
    expect(personTint("#9e1a60").hue).not.toBe(personTint("#1a9e67").hue);
  });
});

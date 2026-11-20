import { describe, expect, it } from "vitest";
import { UserError } from "../errors";
import { optionalText, requireText, sanitizeText } from "../text";

describe("sanitizeText", () => {
  it("strips NUL and other C0 controls", () => {
    expect(sanitizeText("a\u0000b\u0007c\u001Fd\u007Fe")).toBe("abcde");
  });

  it("strips bidi overrides, isolates and direction marks", () => {
    expect(sanitizeText("Ra\u202Ej")).toBe("Raj");
    expect(sanitizeText("\u2066x\u2069 \u202Ay\u202C\u200Fz\u200E")).toBe("x yz");
  });

  it("strips zero-width space, word joiner and BOM", () => {
    expect(sanitizeText("a\u200Bb\u2060c\uFEFFd")).toBe("abcd");
  });

  it("keeps ZWJ and ZWNJ between letters, drops stray ones", () => {
    const family = "\u{1F469}\u200D\u{1F469}\u200D\u{1F467}";
    expect(sanitizeText(family)).toBe(family);
    expect(sanitizeText("മീ\u200Cര")).toBe("മീ\u200Cര");
    expect(sanitizeText("\u200Dab\u200D")).toBe("ab");
    expect(sanitizeText("a \u200D b")).toBe("a b");
    expect(sanitizeText("a\u200D\u200D\u200Db")).toBe("a\u200Db");
  });

  it("keeps ordinary names in several scripts", () => {
    for (const name of ["Meera", "മീര", "नेहा", "👩\u200D👩\u200D👧"]) expect(sanitizeText(name)).toBe(name);
  });

  it("collapses whitespace on one line, turning newlines into spaces", () => {
    expect(sanitizeText("  a \t\n b  ")).toBe("a b");
  });

  it("keeps newlines in multi-line text but removes other controls", () => {
    expect(sanitizeText("line1\r\nline2\u0000\n\n\n\nline3\u2028x", true)).toBe("line1\nline2\n\nline3\nx");
  });
});

describe("requireText and optionalText", () => {
  it("rejects text that is empty once sanitised", () => {
    expect(() => requireText("\u0000\u202E ", "Name", 40)).toThrow(UserError);
    expect(optionalText("\u0000 ", "Notes", 500)).toBeNull();
  });

  it("enforces the length after sanitising, so hidden characters do not count", () => {
    expect(requireText("a".repeat(40) + "\u202E", "Name", 40)).toBe("a".repeat(40));
    expect(() => requireText("a".repeat(41), "Name", 40)).toThrow(/at most 40/);
  });

  it("handles very long strings", () => {
    const huge = "x\u0000 ".repeat(200_000);
    expect(() => requireText(huge, "Name", 40)).toThrow(/at most 40/);
    expect(() => optionalText(huge, "Notes", 500, true)).toThrow(/at most 500/);
  });

  it("rejects non-strings", () => {
    expect(() => requireText(5, "Name", 40)).toThrow(UserError);
    expect(() => optionalText({}, "Notes", 40)).toThrow(UserError);
  });
});

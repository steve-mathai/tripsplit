import { describe, expect, it } from "vitest";
import { MAX_AMOUNT_PAISE } from "../money";
import { buildPrefillQuery, parseQuickAdd, QUICK_ADD_MAX_DESCRIPTION, readPrefill } from "../quick-add";

const members = [
  { id: "m-aarav", name: "Aarav" },
  { id: "m-meera", name: "Meera" },
  { id: "m-mary", name: "Mary Ann" },
  { id: "m-ann", name: "Ann" },
  { id: "m-kabir", name: "Kabir" },
];

const parse = (text: string, me: string | null = "m-aarav") => parseQuickAdd(text, members, me);

describe("parseQuickAdd: the happy path", () => {
  it("reads amount, description and a named payer", () => {
    expect(parse("450 chai Meera")).toEqual({ status: "ready", amountPaise: 45000, description: "chai", paidBy: "m-meera" });
  });

  it("falls back to the current member when no one is named", () => {
    expect(parse("₹1,200 auto fare")).toEqual({
      status: "ready",
      amountPaise: 120000,
      description: "auto fare",
      paidBy: "m-aarav",
    });
  });

  it("asks who paid when there is no name and no identity", () => {
    expect(parse("₹1,200 auto fare", null)).toEqual({ status: "needs-payer", amountPaise: 120000, description: "auto fare" });
  });

  it("does not trust a current member id that is not on the trip", () => {
    expect(parse("90 tea", "m-gone").status).toBe("needs-payer");
  });
});

describe("parseQuickAdd: amounts", () => {
  it.each([
    ["₹450 chai", 45000],
    ["₹ 450 chai", 45000],
    ["Rs 450 chai", 45000],
    ["rs. 450 chai", 45000],
    ["INR 450 chai", 45000],
    ["chai 450", 45000],
    ["chai ₹450", 45000],
    ["1,23,456 villa", 12345600],
    ["1,200 auto", 120000],
    ["450.50 lunch", 45050],
    ["450.5 lunch", 45050],
    ["₹0.75 toffee", 75],
    ["99.995 odd", 10000],
    [".5 coin", 50],
  ])("reads %j as %i paise", (text, paise) => {
    const result = parse(text);
    expect(result.status).toBe("ready");
    if (result.status === "ready") expect(result.amountPaise).toBe(paise);
  });

  it("keeps the description clean when the amount sits in the middle", () => {
    expect(parse("auto ₹120 to fort")).toMatchObject({ status: "ready", description: "auto to fort", amountPaise: 12000 });
  });

  it("lets a currency marker pick the amount among several numbers", () => {
    expect(parse("2 chai ₹40")).toMatchObject({ status: "ready", amountPaise: 4000, description: "2 chai" });
  });

  it("is unclear with no amount", () => {
    expect(parse("chai Meera")).toEqual({
      status: "unclear",
      reason: "no-amount",
      amountPaise: null,
      description: "chai",
      paidBy: "m-meera",
    });
  });

  it("is unclear with two plain numbers", () => {
    expect(parse("2 chai 40 Meera")).toEqual({
      status: "unclear",
      reason: "many-amounts",
      amountPaise: null,
      description: "2 chai 40",
      paidBy: "m-meera",
    });
  });

  it("is unclear with two marked amounts", () => {
    expect(parse("₹40 chai ₹60 vada").status).toBe("unclear");
  });

  it.each(["0 nothing", "₹0 nothing", "-50 refund", "5kg rice", "dinner at 10:30", "12/11 dinner"])(
    "does not read %j as an amount",
    (text) => {
      expect(parse(text)).toMatchObject({ status: "unclear", reason: "no-amount" });
    },
  );

  it("rejects an amount above the cap", () => {
    expect(parse(`${MAX_AMOUNT_PAISE / 100 + 1} villa`)).toMatchObject({ status: "unclear", reason: "no-amount" });
  });

  it("does not read the digits inside a word", () => {
    expect(parse("wifi6 450")).toMatchObject({ status: "ready", amountPaise: 45000, description: "wifi6" });
  });
});

describe("parseQuickAdd: payers", () => {
  it("matches names case-insensitively", () => {
    expect(parse("450 chai MEERA")).toMatchObject({ paidBy: "m-meera", description: "chai" });
    expect(parse("450 chai meera")).toMatchObject({ paidBy: "m-meera", description: "chai" });
  });

  it("matches a name with spaces, however many spaces were typed", () => {
    expect(parse("300 snacks mary   ann")).toMatchObject({ paidBy: "m-mary", description: "snacks" });
  });

  it("prefers the longer name over a shorter one inside it", () => {
    expect(parse("300 snacks Mary Ann")).toMatchObject({ status: "ready", paidBy: "m-mary" });
  });

  it("still finds the short name when it stands alone", () => {
    expect(parse("300 snacks Ann")).toMatchObject({ status: "ready", paidBy: "m-ann" });
  });

  it("finds the payer at the start, middle or end", () => {
    expect(parse("Meera 450 chai")).toMatchObject({ paidBy: "m-meera", description: "chai" });
    expect(parse("450 Meera chai")).toMatchObject({ paidBy: "m-meera", description: "chai" });
  });

  it("drops 'by' and 'paid by' before the name", () => {
    expect(parse("450 chai paid by Meera")).toMatchObject({ paidBy: "m-meera", description: "chai" });
    expect(parse("450 chai by Meera")).toMatchObject({ paidBy: "m-meera", description: "chai" });
  });

  it("does not match a name inside another word", () => {
    expect(parse("450 Meerabai tea")).toMatchObject({ paidBy: "m-aarav", description: "Meerabai tea" });
  });

  it("falls back to the current member when the name matches nobody", () => {
    expect(parse("450 chai Priya")).toMatchObject({ status: "ready", paidBy: "m-aarav", description: "chai Priya" });
  });

  it("is unclear when two different members are named", () => {
    expect(parse("450 dinner Meera Kabir")).toEqual({
      status: "unclear",
      reason: "many-payers",
      amountPaise: 45000,
      description: "dinner Meera Kabir",
      paidBy: null,
    });
  });

  it("does not choke on regex characters in names", () => {
    const odd = [{ id: "m-x", name: "J. (Jo) +" }];
    expect(parseQuickAdd("90 tea J. (Jo) +", odd, null)).toMatchObject({ paidBy: "m-x" });
  });

  it("ignores members with blank names", () => {
    expect(parseQuickAdd("90 tea", [{ id: "m-blank", name: "  " }], "m-blank").status).toBe("ready");
  });
});

describe("parseQuickAdd: descriptions", () => {
  it("is unclear with no description", () => {
    expect(parse("450")).toMatchObject({ status: "unclear", reason: "no-description", amountPaise: 45000 });
    expect(parse("450 Meera")).toMatchObject({ status: "unclear", reason: "no-description", paidBy: "m-meera" });
  });

  it("is unclear for empty and whitespace input", () => {
    expect(parse("")).toMatchObject({ status: "unclear", reason: "no-amount" });
    expect(parse("   ")).toMatchObject({ status: "unclear", reason: "no-amount" });
  });

  it("collapses runs of spaces and trims stray punctuation", () => {
    expect(parse("  450,   chai   and   samosa. ")).toMatchObject({ description: "chai and samosa" });
  });

  it("is unclear when the description would not fit the form", () => {
    const long = "x".repeat(QUICK_ADD_MAX_DESCRIPTION + 1);
    expect(parse(`450 ${long}`)).toMatchObject({ status: "unclear", reason: "long-description", description: long });
    expect(parse(`450 ${"x".repeat(QUICK_ADD_MAX_DESCRIPTION)}`).status).toBe("ready");
  });

  it("keeps the typed case of the description", () => {
    expect(parse("450 Masala Dosa")).toMatchObject({ description: "Masala Dosa" });
  });
});

describe("prefill round trip", () => {
  const ids = members.map((m) => m.id);

  it("carries what was understood into the form values", () => {
    const query = buildPrefillQuery({ amountPaise: 45050, description: "chai & vada", paidBy: "m-meera" });
    const search = Object.fromEntries(new URLSearchParams(query));
    expect(readPrefill(search, ids)).toEqual({ amountPaise: 45050, description: "chai & vada", paidBy: "m-meera" });
  });

  it("leaves out what was not understood", () => {
    expect(buildPrefillQuery({ amountPaise: null, description: "", paidBy: null })).toBe("");
    expect(readPrefill({}, ids)).toEqual({});
  });

  it("writes whole rupees without paise", () => {
    expect(buildPrefillQuery({ amountPaise: 120000, description: "", paidBy: null })).toBe("amount=1200");
  });

  it("drops bad values from an untrusted URL", () => {
    expect(readPrefill({ amount: "abc", paidBy: "someone-else", description: "   " }, ids)).toEqual({});
    expect(readPrefill({ amount: "-5" }, ids)).toEqual({});
    expect(readPrefill({ amount: "0" }, ids)).toEqual({});
    expect(readPrefill({ amount: String(MAX_AMOUNT_PAISE) }, ids)).toEqual({});
  });

  it("takes the first of a repeated param and caps the description", () => {
    const result = readPrefill({ amount: ["10", "20"], description: "y".repeat(500) }, ids);
    expect(result.amountPaise).toBe(1000);
    expect(result.description).toHaveLength(QUICK_ADD_MAX_DESCRIPTION);
  });
});

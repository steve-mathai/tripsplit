import { CATEGORIES, EMOJIS, SPLIT_MODES } from "../../lib/types";
import { DAY_ONE_OPTIONS, PAYMENT_COUNT, PEOPLE_COUNT } from "./demo";
import { delay } from "./delay";
import { BODY, LEAD, TITLE } from "./type";

interface Item {
  name: string;
  value: string;
  note: string;
}

const WORDS = ["zero", "one", "two", "three", "four", "five", "six"];
const winner = DAY_ONE_OPTIONS.reduce((a, b) => (b.yes > a.yes ? b : a));

// Every value below is read from the app: the type lists, the demo trip, or behaviour checked in the code.
const GROUPS: { id: string; name: string; items: Item[] }[] = [
  {
    id: "menu-plan",
    name: "Plan",
    items: [
      { name: "Day-by-day plan", value: "Up to 60 days", note: "Times, notes and a card per day." },
      { name: "Votes with a tally", value: `${winner.yes} in · ${winner.no} out`, note: "Put options up, everyone votes." },
      { name: "Lock in the winner", value: "1 tap", note: "The winner becomes the plan." },
      { name: "Reactions", value: `${WORDS[EMOJIS.length]} emoji`, note: "A quick reaction on any plan item." },
    ],
  },
  {
    id: "menu-split",
    name: "Split",
    items: [
      { name: "Equal, exact or shares", value: `${WORDS[SPLIT_MODES.length]} ways`, note: "Only those who joined pay." },
      { name: "Categories", value: String(CATEGORIES.length), note: "Stay, travel, food and activities." },
      { name: "Rupees to the paisa", value: "₹0.01", note: "Shown the Indian way: ₹1,23,456." },
    ],
  },
  {
    id: "menu-settle",
    name: "Settle",
    items: [
      { name: "Fewest payments", value: `${PAYMENT_COUNT} for ${PEOPLE_COUNT} people`, note: "Nobody pays twice." },
      { name: "UPI pay links", value: "per payment", note: "Once the payee adds a UPI id." },
      { name: "Copy for WhatsApp", value: "1 message", note: "The whole list, ready to paste." },
      { name: "Price", value: "Free, no sign-up", note: "Anyone with the link can edit." },
    ],
  },
];

/** Shallow zigzag along the top and bottom edge; the sides stay straight. 24 teeth, 10px deep. */
function zigzag(): string {
  const teeth = 24;
  const depth = "10px";
  const top = Array.from({ length: teeth * 2 + 1 }, (_, i) => `${(i / (teeth * 2)) * 100}% ${i % 2 === 0 ? depth : "0px"}`);
  const bottom = Array.from({ length: teeth * 2 + 1 }, (_, i) => {
    const x = ((teeth * 2 - i) / (teeth * 2)) * 100;
    return `${x}% ${i % 2 === 0 ? `calc(100% - ${depth})` : "100%"}`;
  });
  return `polygon(${[...top, ...bottom].join(", ")})`;
}
const CUT = zigzag();

export function Menu() {
  return (
    <section id="menu" aria-labelledby="menu-title" className="mt-24 bg-accent-soft py-16 lg:mt-40 lg:py-28">
      <div
        data-reveal="rise"
        className="mx-4 bg-surface px-5 pb-16 pt-14 sm:mx-auto sm:w-[560px] sm:px-12"
        style={{ clipPath: CUT }}
      >
        <h2 id="menu-title" className={`${TITLE} text-center`}>
          What&apos;s included
        </h2>
        {GROUPS.map((group, groupIndex) => (
          <div key={group.id} className="mt-10" data-reveal="rise" style={delay(groupIndex + 1)}>
            <h3 id={group.id} className={`${LEAD} font-semibold`}>
              {group.name}
            </h3>
            <dl className="mt-4 space-y-5">
              {group.items.map((item) => (
                <div key={item.name} data-reveal="rise" style={delay(groupIndex + 2)}>
                  <div className="flex items-baseline gap-2">
                    <dt className={`${LEAD} shrink-0`}>{item.name}</dt>
                    <span aria-hidden="true" className="min-w-4 flex-1 -translate-y-1 border-b-4 border-dotted border-muted" />
                    <dd className={`${BODY} shrink-0 text-right font-semibold`}>{item.value}</dd>
                  </div>
                  <dd className={`${BODY} mt-1 max-w-[34ch]`}>{item.note}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}

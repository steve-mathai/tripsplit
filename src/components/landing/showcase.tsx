import { OutputIndex } from "./output-index";
import { BillsSheet, MessageSheet, PlanSheet, SettleSheet } from "./sheets";
import { TITLE, MARGIN } from "./type";

const OUTPUTS = [
  { id: "plan", name: "The day plan", caption: "Times, notes and a vote for every open choice, one card per day.", sheet: <PlanSheet /> },
  { id: "bills", name: "Every bill", caption: "Who paid what, by category, with the total and the share per head.", sheet: <BillsSheet /> },
  { id: "settle", name: "Who pays whom", caption: "Each person's balance, then the fewest payments that clear them all.", sheet: <SettleSheet /> },
  { id: "message", name: "The message for the group", caption: "The same list as plain text, ready to paste into WhatsApp.", sheet: <MessageSheet /> },
];

export function Showcase() {
  return (
    <section aria-labelledby="showcase-title" className={`${MARGIN} pt-24 lg:pt-40`}>
      <OutputIndex
        outputs={OUTPUTS}
        heading={
          <h2 id="showcase-title" className={TITLE}>
            What the group gets
          </h2>
        }
      />
    </section>
  );
}

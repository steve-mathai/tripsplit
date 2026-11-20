import { ExpenseFragment, PickerFragment, SettleFragment } from "./how-fragments";
import { HowPinned } from "./how-pinned";
import { MARGIN } from "./type";

const STEPS = [
  {
    title: "Drop one link in the group.",
    body: "Everyone taps their name once. No accounts, no app to install.",
    fragment: <PickerFragment />,
  },
  {
    title: "Add what you spend.",
    body: "Type the amount, pick who shared it: equally, exact or by shares.",
    fragment: <ExpenseFragment />,
  },
  {
    title: "Settle in a few payments.",
    body: "The fewest payments that clear every balance, ready to pay or paste.",
    fragment: <SettleFragment />,
  },
];

export function How() {
  return (
    <section id="how" aria-labelledby="how-title" className={`${MARGIN} pt-24 lg:pt-40`}>
      <HowPinned heading="How it works" steps={STEPS} />
    </section>
  );
}

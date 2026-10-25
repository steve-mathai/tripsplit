// Demo trip content. Pure data (no DB imports) so the seed and the unit tests share it.
// People are referred to by first name; the seed maps names to generated member ids.
import type { Category, Emoji, PlanKind, SplitMode, Vote } from "../lib/types";

export const DEMO_SLUG = "kochi-2026";

export const DEMO_TRIP = {
  slug: DEMO_SLUG,
  name: "Kochi Gang 2026",
  baseLocation: "Thammanam, Kochi",
  startDate: "2026-10-30",
  endDate: "2026-11-02",
} as const;

// Made-up names; deliberately no UPI ids so no real person's id can appear here.
export const DEMO_MEMBER_NAMES = [
  "Aarav",
  "Diya",
  "Kabir",
  "Meera",
  "Nikhil",
  "Ananya",
  "Rohan",
  "Ishita",
  "Varun",
  "Zoya",
  "Farhan",
] as const;

type Name = (typeof DEMO_MEMBER_NAMES)[number];

export interface DemoReaction {
  member: Name;
  vote?: Vote;
  emoji?: Emoji;
}

export interface DemoPlanItem {
  day: string;
  time: string;
  title: string;
  notes?: string;
  kind: PlanKind;
  createdBy: Name;
  reactions?: DemoReaction[];
}

export interface DemoExpense {
  description: string;
  category: Category;
  amountPaise: number;
  paidBy: Name;
  splitMode: SplitMode;
  day: string;
  splits: { member: Name; weight: number }[];
}

const FRI = "2026-10-30";
const SAT = "2026-10-31";
const SUN = "2026-11-01";
const MON = "2026-11-02";

const rupees = (amount: number) => Math.round(amount * 100);

export const DEMO_PLAN_ITEMS: DemoPlanItem[] = [
  { day: FRI, time: "06:00", title: "Arrive at Ernakulam Jn", notes: "Overnight train; grab chai at the station.", kind: "plan", createdBy: "Aarav" },
  { day: FRI, time: "08:00", title: "Check in at the Thammanam homestay", notes: "Three rooms plus the terrace. Drop bags and freshen up.", kind: "plan", createdBy: "Aarav", reactions: [{ member: "Diya", emoji: "😍" }, { member: "Meera", emoji: "😴" }] },
  { day: FRI, time: "11:00", title: "Fort Kochi walk", notes: "Chinese fishing nets, Princess Street, the old Jew Town lanes.", kind: "plan", createdBy: "Diya", reactions: [{ member: "Kabir", emoji: "🔥" }, { member: "Ananya", emoji: "😍" }, { member: "Zoya", emoji: "😍" }] },
  { day: FRI, time: "13:30", title: "Lunch: Kerala meals", notes: "Banana-leaf meals, fish fry optional.", kind: "plan", createdBy: "Kabir" },
  { day: FRI, time: "17:30", title: "Sunset at Fort Kochi beach", kind: "plan", createdBy: "Ananya", reactions: [{ member: "Rohan", emoji: "😍" }, { member: "Ishita", emoji: "😍" }] },
  { day: FRI, time: "20:00", title: "Dinner near the homestay", notes: "Venue decided by the vote below.", kind: "plan", createdBy: "Aarav" },
  {
    day: FRI, time: "20:00", title: "Seafood at a toddy-style shack", notes: "Karimeen pollichathu and prawn roast; a bit pricey.", kind: "option", createdBy: "Nikhil",
    reactions: [
      { member: "Nikhil", vote: "up", emoji: "🔥" }, { member: "Rohan", vote: "up" }, { member: "Varun", vote: "up", emoji: "🔥" },
      { member: "Farhan", vote: "up" }, { member: "Meera", vote: "down", emoji: "💸" }, { member: "Zoya", vote: "down" },
    ],
  },
  {
    day: FRI, time: "20:00", title: "Biryani place near MG Road", notes: "Cheap, filling, 10 minutes by auto.", kind: "option", createdBy: "Ishita",
    reactions: [
      { member: "Ishita", vote: "up", emoji: "😍" }, { member: "Diya", vote: "up" }, { member: "Meera", vote: "up", emoji: "😍" },
      { member: "Zoya", vote: "up" }, { member: "Ananya", vote: "up" }, { member: "Kabir", vote: "down", emoji: "🤔" },
    ],
  },

  { day: SAT, time: "06:00", title: "KSRTC bus to Munnar", notes: "Ernakulam KSRTC stand; sit on the left for the views.", kind: "plan", createdBy: "Varun", reactions: [{ member: "Farhan", emoji: "😴" }] },
  { day: SAT, time: "10:30", title: "Tea gardens and Tea Museum", kind: "plan", createdBy: "Meera", reactions: [{ member: "Ananya", emoji: "😍" }, { member: "Diya", emoji: "😍" }] },
  { day: SAT, time: "13:00", title: "Lunch in Munnar town", kind: "plan", createdBy: "Meera" },
  { day: SAT, time: "15:00", title: "Mattupetty Dam and Echo Point", kind: "plan", createdBy: "Rohan", reactions: [{ member: "Kabir", emoji: "🔥" }] },
  { day: SAT, time: "18:30", title: "Bus back to Kochi", kind: "plan", createdBy: "Varun" },
  {
    day: SAT, time: "08:30", title: "Jeep safari to Kolukkumalai", notes: "Sunrise tea estate, rough road, about ₹700 each.", kind: "option", createdBy: "Kabir",
    reactions: [
      { member: "Kabir", vote: "up", emoji: "🔥" }, { member: "Rohan", vote: "up", emoji: "🔥" }, { member: "Varun", vote: "up" },
      { member: "Aarav", vote: "up" }, { member: "Nikhil", vote: "up", emoji: "💸" }, { member: "Zoya", vote: "up" },
      { member: "Diya", vote: "down", emoji: "💸" }, { member: "Ishita", vote: "down" },
    ],
  },
  {
    day: SAT, time: "08:30", title: "Photo stop at Top Station", notes: "Free, easy, great view over the valley.", kind: "option", createdBy: "Ananya",
    reactions: [
      { member: "Ananya", vote: "up", emoji: "😍" }, { member: "Diya", vote: "up", emoji: "😍" }, { member: "Ishita", vote: "up" },
      { member: "Meera", vote: "up" }, { member: "Farhan", vote: "down" },
    ],
  },

  { day: SUN, time: "10:00", title: "Train to Alappuzha", kind: "plan", createdBy: "Farhan" },
  { day: SUN, time: "12:00", title: "Shikara ride on the backwaters", notes: "Two boats, bring caps and sunscreen.", kind: "plan", createdBy: "Diya", reactions: [{ member: "Aarav", emoji: "😍" }, { member: "Zoya", emoji: "🔥" }, { member: "Rohan", emoji: "🤔" }] },
  { day: SUN, time: "14:30", title: "Kuttanad lunch", kind: "plan", createdBy: "Ishita" },
  { day: SUN, time: "17:00", title: "Alleppey beach and lighthouse", kind: "plan", createdBy: "Zoya", reactions: [{ member: "Meera", emoji: "😍" }] },
  { day: SUN, time: "19:00", title: "Toddy shop dinner", notes: "Kappa and fish curry. Toddy is optional.", kind: "plan", createdBy: "Nikhil", reactions: [{ member: "Nikhil", emoji: "🔥" }, { member: "Varun", emoji: "🔥" }, { member: "Farhan", emoji: "🔥" }, { member: "Ananya", emoji: "🤔" }] },
  { day: SUN, time: "21:30", title: "Back to Kochi", kind: "plan", createdBy: "Farhan" },

  {
    day: MON, time: "07:00", title: "Kayaking at Mangalavanam", notes: "Early slot, about ₹900 each, limited to 5 people.", kind: "option", createdBy: "Varun",
    reactions: [
      { member: "Varun", vote: "up", emoji: "🔥" }, { member: "Kabir", vote: "up" }, { member: "Rohan", vote: "up", emoji: "🔥" },
      { member: "Zoya", vote: "up" }, { member: "Aarav", vote: "up" }, { member: "Meera", vote: "down", emoji: "😴" },
    ],
  },
  {
    day: MON, time: "07:00", title: "Sleep in", notes: "Slow morning, filter coffee on the terrace.", kind: "option", createdBy: "Meera",
    reactions: [
      { member: "Meera", vote: "up", emoji: "😴" }, { member: "Diya", vote: "up", emoji: "😴" }, { member: "Ananya", vote: "up" },
      { member: "Ishita", vote: "up", emoji: "😴" }, { member: "Farhan", vote: "up" }, { member: "Nikhil", vote: "up", emoji: "😴" },
    ],
  },
  { day: MON, time: "12:00", title: "Lunch at Lulu Mall, then Marine Drive", kind: "plan", createdBy: "Aarav", reactions: [{ member: "Ananya", emoji: "💸" }] },
  { day: MON, time: "16:00", title: "Pack up and leave the homestay", kind: "plan", createdBy: "Aarav" },
  { day: MON, time: "20:35", title: "Train home", notes: "Reach Ernakulam Jn by 19:45.", kind: "plan", createdBy: "Aarav" },
];

const everyone = DEMO_MEMBER_NAMES.map((member) => ({ member, weight: 1 }));
const equalAmong = (...names: Name[]) => names.map((member) => ({ member, weight: 1 }));
const without = (...skipped: Name[]) => everyone.filter((s) => !skipped.includes(s.member));

const drinkers: Name[] = ["Aarav", "Kabir", "Nikhil", "Rohan", "Varun", "Farhan"];

export const DEMO_EXPENSES: DemoExpense[] = [
  // Friday
  { description: "Homestay, 3 nights", category: "stay", amountPaise: rupees(27500), paidBy: "Aarav", splitMode: "equal", day: FRI, splits: everyone },
  { description: "Train tickets to Kochi", category: "travel", amountPaise: rupees(6930), paidBy: "Diya", splitMode: "equal", day: FRI, splits: everyone },
  { description: "Autos from the station", category: "travel", amountPaise: rupees(920), paidBy: "Meera", splitMode: "equal", day: FRI, splits: equalAmong("Meera", "Kabir", "Nikhil", "Ananya", "Rohan", "Ishita") },
  { description: "Chai and banana fritters", category: "food", amountPaise: rupees(1333), paidBy: "Nikhil", splitMode: "equal", day: FRI, splits: everyone },
  {
    description: "Fort Kochi lunch (Kerala meals)", category: "food", amountPaise: rupees(2145), paidBy: "Kabir", splitMode: "exact", day: FRI,
    splits: [
      { member: "Aarav", weight: rupees(220) }, { member: "Diya", weight: rupees(185) }, { member: "Kabir", weight: rupees(210) },
      { member: "Meera", weight: rupees(175) }, { member: "Nikhil", weight: rupees(240) }, { member: "Ananya", weight: rupees(165) },
      { member: "Rohan", weight: rupees(200) }, { member: "Ishita", weight: rupees(180) }, { member: "Varun", weight: rupees(195) },
      { member: "Zoya", weight: rupees(150) }, { member: "Farhan", weight: rupees(225) },
    ],
  },
  { description: "Kathakali show tickets", category: "activities", amountPaise: rupees(2200), paidBy: "Ishita", splitMode: "equal", day: FRI, splits: equalAmong("Diya", "Ishita", "Zoya", "Meera", "Varun") },
  { description: "Beach corn and ice cream", category: "food", amountPaise: rupees(1190), paidBy: "Ananya", splitMode: "equal", day: FRI, splits: everyone },
  { description: "Dinner near the homestay", category: "food", amountPaise: rupees(3675), paidBy: "Rohan", splitMode: "equal", day: FRI, splits: everyone },

  // Saturday: Farhan stayed back, so Munnar costs are among the other 10
  { description: "KSRTC buses to Munnar and back", category: "travel", amountPaise: rupees(2860), paidBy: "Varun", splitMode: "equal", day: SAT, splits: without("Farhan") },
  { description: "Breakfast at Munnar bus stand", category: "food", amountPaise: rupees(1420), paidBy: "Zoya", splitMode: "equal", day: SAT, splits: without("Farhan") },
  { description: "Tea Museum tickets", category: "activities", amountPaise: rupees(1145), paidBy: "Meera", splitMode: "equal", day: SAT, splits: equalAmong("Meera", "Ananya", "Diya", "Ishita", "Zoya", "Aarav", "Nikhil", "Varun") },
  { description: "Jeep safari to Kolukkumalai", category: "activities", amountPaise: rupees(4200), paidBy: "Kabir", splitMode: "equal", day: SAT, splits: equalAmong("Kabir", "Rohan", "Varun", "Aarav", "Nikhil", "Zoya") },
  { description: "Munnar lunch", category: "food", amountPaise: rupees(4687), paidBy: "Meera", splitMode: "equal", day: SAT, splits: without("Farhan") },
  { description: "Mattupetty Dam and Echo Point entry", category: "activities", amountPaise: rupees(1070), paidBy: "Rohan", splitMode: "equal", day: SAT, splits: equalAmong("Rohan", "Kabir", "Diya", "Ananya", "Ishita", "Varun", "Zoya") },
  { description: "Evening chai in Munnar", category: "food", amountPaise: rupees(560), paidBy: "Rohan", splitMode: "equal", day: SAT, splits: without("Farhan") },

  // Sunday
  { description: "Train to Alappuzha", category: "travel", amountPaise: rupees(1447), paidBy: "Farhan", splitMode: "equal", day: SUN, splits: everyone },
  { description: "Shikara ride", category: "activities", amountPaise: rupees(3600), paidBy: "Diya", splitMode: "equal", day: SUN, splits: everyone },
  { description: "Kuttanad lunch", category: "food", amountPaise: rupees(5285), paidBy: "Ishita", splitMode: "equal", day: SUN, splits: everyone },
  { description: "Lighthouse tickets", category: "activities", amountPaise: rupees(340), paidBy: "Zoya", splitMode: "equal", day: SUN, splits: everyone },
  {
    // Drinkers count for two shares, everyone else one.
    description: "Toddy shop dinner (kappa, fish curry, toddy)", category: "food", amountPaise: rupees(4180), paidBy: "Nikhil", splitMode: "shares", day: SUN,
    splits: DEMO_MEMBER_NAMES.map((member) => ({ member, weight: drinkers.includes(member) ? 2 : 1 })),
  },
  { description: "Bus back to Kochi", category: "travel", amountPaise: rupees(1267), paidBy: "Meera", splitMode: "equal", day: SUN, splits: everyone },

  // Monday
  { description: "Kayaking at Mangalavanam", category: "activities", amountPaise: rupees(4500), paidBy: "Varun", splitMode: "equal", day: MON, splits: equalAmong("Varun", "Kabir", "Rohan", "Zoya", "Aarav") },
  { description: "Lulu Mall lunch", category: "food", amountPaise: rupees(6125), paidBy: "Aarav", splitMode: "equal", day: MON, splits: everyone },
  { description: "Marine Drive snacks", category: "food", amountPaise: rupees(847), paidBy: "Ananya", splitMode: "equal", day: MON, splits: without("Kabir", "Varun") },
  { description: "Water bottles and train snacks", category: "food", amountPaise: rupees(640), paidBy: "Zoya", splitMode: "equal", day: MON, splits: everyone },
];

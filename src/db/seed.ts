import { eq } from "drizzle-orm";
import { DEMO_EXPENSES, DEMO_MEMBER_NAMES, DEMO_PLAN_ITEMS, DEMO_SLUG, DEMO_TRIP } from "./demo-data";
import { db } from "./index";
import { addPlanItem, createExpense, createTrip, setEmoji, setVote } from "./queries";
import { trips } from "./schema";

/** Deletes and recreates the demo trip, so running it repeatedly is safe. */
async function seed() {
  await db.delete(trips).where(eq(trips.slug, DEMO_SLUG)); // cascades to everything under it

  const created = await createTrip({
    ...DEMO_TRIP,
    members: DEMO_MEMBER_NAMES.map((name) => ({ name })),
  });
  const idOf = (name: string): string => {
    const member = created.members.find((m) => m.name === name);
    if (!member) throw new Error(`Demo data mentions ${name}, who is not a demo member`);
    return member.id;
  };

  for (const item of DEMO_PLAN_ITEMS) {
    const row = await addPlanItem(created.tripId, {
      day: item.day,
      time: item.time,
      title: item.title,
      notes: item.notes,
      kind: item.kind,
      createdBy: idOf(item.createdBy),
    });
    for (const reaction of item.reactions ?? []) {
      if (reaction.vote) await setVote(row.id, idOf(reaction.member), reaction.vote);
      if (reaction.emoji) await setEmoji(row.id, idOf(reaction.member), reaction.emoji);
    }
  }

  for (const expense of DEMO_EXPENSES) {
    await createExpense(created.tripId, {
      description: expense.description,
      category: expense.category,
      amountPaise: expense.amountPaise,
      paidBy: idOf(expense.paidBy),
      splitMode: expense.splitMode,
      day: expense.day,
      splits: expense.splits.map((s) => ({ memberId: idOf(s.member), weight: s.weight })),
    });
  }

  console.log(
    `Seeded /t/${DEMO_SLUG}: ${created.members.length} members, ${DEMO_PLAN_ITEMS.length} plan items, ${DEMO_EXPENSES.length} expenses.`,
  );
}

seed()
  .then(() => process.exit(0)) // PGlite keeps a handle open otherwise
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

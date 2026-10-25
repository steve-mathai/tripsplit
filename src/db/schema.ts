import { sql } from "drizzle-orm";
import {
  check,
  date,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { Category, Emoji, PlanKind, SplitMode, Vote } from "../lib/types";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const trips = pgTable("trips", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  baseLocation: text("base_location").notNull(),
  // Dates are plain 'YYYY-MM-DD' strings: no timezone surprises on the way to the UI.
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }).notNull(),
  currency: text("currency").notNull().default("INR"),
  createdAt: createdAt(),
});

export const members = pgTable(
  "members",
  {
    id: text("id").primaryKey(),
    tripId: text("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    upiId: text("upi_id"),
    color: text("color").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("members_trip_name_unique").on(t.tripId, sql`lower(${t.name})`)],
);

export const planItems = pgTable(
  "plan_items",
  {
    id: text("id").primaryKey(),
    tripId: text("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    time: text("time"),
    title: text("title").notNull(),
    notes: text("notes"),
    kind: text("kind").$type<PlanKind>().notNull().default("plan"),
    createdBy: text("created_by").references(() => members.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [check("plan_items_kind_check", sql`${t.kind} in ('plan', 'option')`)],
);

// One row per (item, member) holding at most one up/down vote and one emoji reaction.
export const votes = pgTable(
  "votes",
  {
    planItemId: text("plan_item_id")
      .notNull()
      .references(() => planItems.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    vote: text("vote").$type<Vote>(),
    emoji: text("emoji").$type<Emoji>(),
  },
  (t) => [
    primaryKey({ columns: [t.planItemId, t.memberId] }),
    check("votes_vote_check", sql`${t.vote} in ('up', 'down')`),
    check("votes_emoji_check", sql`${t.emoji} in ('🔥', '😍', '😴', '💸', '🤔')`),
  ],
);

export const expenses = pgTable(
  "expenses",
  {
    id: text("id").primaryKey(),
    tripId: text("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    category: text("category").$type<Category>().notNull(),
    amountPaise: integer("amount_paise").notNull(),
    paidBy: text("paid_by")
      .notNull()
      .references(() => members.id),
    splitMode: text("split_mode").$type<SplitMode>().notNull(),
    day: date("day", { mode: "string" }),
    createdAt: createdAt(),
  },
  (t) => [
    check("expenses_amount_check", sql`${t.amountPaise} > 0`),
    check("expenses_category_check", sql`${t.category} in ('stay', 'travel', 'food', 'activities')`),
    check("expenses_split_mode_check", sql`${t.splitMode} in ('equal', 'exact', 'shares')`),
  ],
);

export const expenseSplits = pgTable(
  "expense_splits",
  {
    expenseId: text("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    // No cascade: a member with splits cannot be deleted (removeMember checks first).
    memberId: text("member_id")
      .notNull()
      .references(() => members.id),
    weight: integer("weight").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.expenseId, t.memberId] }),
    check("expense_splits_weight_check", sql`${t.weight} >= 0`),
  ],
);

CREATE TABLE "expense_splits" (
	"expense_id" text NOT NULL,
	"member_id" text NOT NULL,
	"weight" integer NOT NULL,
	CONSTRAINT "expense_splits_expense_id_member_id_pk" PRIMARY KEY("expense_id","member_id"),
	CONSTRAINT "expense_splits_weight_check" CHECK ("expense_splits"."weight" >= 0)
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"amount_paise" integer NOT NULL,
	"paid_by" text NOT NULL,
	"split_mode" text NOT NULL,
	"day" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_amount_check" CHECK ("expenses"."amount_paise" > 0),
	CONSTRAINT "expenses_category_check" CHECK ("expenses"."category" in ('stay', 'travel', 'food', 'activities')),
	CONSTRAINT "expenses_split_mode_check" CHECK ("expenses"."split_mode" in ('equal', 'exact', 'shares'))
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"name" text NOT NULL,
	"upi_id" text,
	"color" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_items" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"day" date NOT NULL,
	"time" text,
	"title" text NOT NULL,
	"notes" text,
	"kind" text DEFAULT 'plan' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_items_kind_check" CHECK ("plan_items"."kind" in ('plan', 'option'))
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"base_location" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trips_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"plan_item_id" text NOT NULL,
	"member_id" text NOT NULL,
	"vote" text,
	"emoji" text,
	CONSTRAINT "votes_plan_item_id_member_id_pk" PRIMARY KEY("plan_item_id","member_id"),
	CONSTRAINT "votes_vote_check" CHECK ("votes"."vote" in ('up', 'down')),
	CONSTRAINT "votes_emoji_check" CHECK ("votes"."emoji" in ('🔥', '😍', '😴', '💸', '🤔'))
);
--> statement-breakpoint
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_paid_by_members_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_created_by_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_plan_item_id_plan_items_id_fk" FOREIGN KEY ("plan_item_id") REFERENCES "public"."plan_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "members_trip_name_unique" ON "members" USING btree ("trip_id",lower("name"));
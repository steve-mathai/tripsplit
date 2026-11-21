CREATE TABLE "settlements" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"from_member" text NOT NULL,
	"to_member" text NOT NULL,
	"amount_paise" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settlements_amount_check" CHECK ("settlements"."amount_paise" > 0),
	CONSTRAINT "settlements_distinct_members_check" CHECK ("settlements"."from_member" <> "settlements"."to_member")
);
--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_from_member_members_id_fk" FOREIGN KEY ("from_member") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_to_member_members_id_fk" FOREIGN KEY ("to_member") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;
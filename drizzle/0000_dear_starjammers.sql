CREATE TYPE "public"."period_type" AS ENUM('semester', 'trimester', 'quarter', 'year');--> statement-breakpoint
CREATE TABLE "academic_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academic_periods_group_number_unique" UNIQUE("group_id","number"),
	CONSTRAINT "academic_periods_number_range" CHECK ("academic_periods"."number" between 1 and 99),
	CONSTRAINT "academic_periods_date_range" CHECK ("academic_periods"."starts_on" <= "academic_periods"."ends_on")
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(80) NOT NULL,
	"period_type" "period_type",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "academic_periods" ADD CONSTRAINT "academic_periods_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "academic_periods_group_id_idx" ON "academic_periods" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "academic_periods_starts_on_idx" ON "academic_periods" USING btree ("starts_on");--> statement-breakpoint
CREATE INDEX "academic_periods_ends_on_idx" ON "academic_periods" USING btree ("ends_on");
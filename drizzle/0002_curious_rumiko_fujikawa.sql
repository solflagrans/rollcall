UPDATE "groups" SET "period_type" = 'semester' WHERE "period_type" IS NULL;--> statement-breakpoint
ALTER TABLE "groups" ALTER COLUMN "period_type" SET NOT NULL;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "btree_gist";--> statement-breakpoint
ALTER TABLE "academic_periods"
ADD CONSTRAINT "academic_periods_group_dates_excl"
EXCLUDE USING gist (
  "group_id" WITH =,
  daterange("starts_on", "ends_on", '[]') WITH &&
);

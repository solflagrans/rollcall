DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "group_members"
		WHERE "email" IS NOT NULL AND btrim("email") <> ''
		GROUP BY "group_id", lower(btrim("email"))
		HAVING count(*) > 1
	) THEN
		RAISE EXCEPTION 'Cannot normalize group member emails: case-insensitive duplicates exist';
	END IF;
END $$;--> statement-breakpoint
UPDATE "group_members"
SET "email" = nullif(lower(btrim("email")), '')
WHERE "email" IS NOT NULL;--> statement-breakpoint
DROP INDEX "group_members_group_email_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "group_members_group_email_unique" ON "group_members" USING btree ("group_id",lower(btrim("email"))) WHERE "group_members"."email" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_email_normalized" CHECK ("group_members"."email" IS NULL OR ("group_members"."email" = lower(btrim("group_members"."email")) AND btrim("group_members"."email") <> ''));

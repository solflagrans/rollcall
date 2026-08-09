DROP INDEX "group_invitations_one_pending_per_member";--> statement-breakpoint
UPDATE "group_invitations"
SET "expires_at" = LEAST("expires_at", "created_at" + interval '24 hours'),
    "updated_at" = now()
WHERE "method" = 'link' AND "status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "group_invitations_one_pending_per_member_method" ON "group_invitations" USING btree ("group_member_id","method") WHERE "group_invitations"."status" = 'pending';

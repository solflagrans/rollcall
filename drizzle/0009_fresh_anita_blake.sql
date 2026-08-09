CREATE TYPE "public"."group_invitation_method" AS ENUM('rollcall_id', 'link');--> statement-breakpoint
CREATE TYPE "public"."group_invitation_status" AS ENUM('pending', 'accepted', 'declined', 'expired', 'revoked');--> statement-breakpoint
CREATE TABLE "group_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" varchar(12) DEFAULT substring(translate(encode(uuid_send(gen_random_uuid()), 'base64'), '+/', '-_') from 1 for 12) NOT NULL,
	"group_id" uuid NOT NULL,
	"group_member_id" uuid NOT NULL,
	"invited_by_user_id" varchar(255) NOT NULL,
	"target_user_id" varchar(255),
	"method" "group_invitation_method" NOT NULL,
	"token_hash" varchar(64),
	"status" "group_invitation_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone,
	CONSTRAINT "group_invitations_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "group_invitations_method_target" CHECK (("group_invitations"."method" = 'rollcall_id' AND "group_invitations"."target_user_id" IS NOT NULL AND "group_invitations"."token_hash" IS NULL) OR ("group_invitations"."method" = 'link' AND "group_invitations"."token_hash" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "group_members" DROP CONSTRAINT "group_members_email_normalized";--> statement-breakpoint
DROP INDEX "group_members_group_email_unique";--> statement-breakpoint
ALTER TABLE "auth_user_profiles" ADD COLUMN "rollcall_id" varchar(19) DEFAULT 'rc_' || substring(translate(encode(uuid_send(gen_random_uuid()), 'base64'), '+/', '-_') from 1 for 16) NOT NULL;--> statement-breakpoint
ALTER TABLE "group_invitations" ADD CONSTRAINT "group_invitations_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_invitations" ADD CONSTRAINT "group_invitations_group_member_id_group_members_id_fk" FOREIGN KEY ("group_member_id") REFERENCES "public"."group_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_invitations" ADD CONSTRAINT "group_invitations_invited_by_user_id_auth_user_profiles_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."auth_user_profiles"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_invitations" ADD CONSTRAINT "group_invitations_target_user_id_auth_user_profiles_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."auth_user_profiles"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "group_invitations_group_idx" ON "group_invitations" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "group_invitations_member_idx" ON "group_invitations" USING btree ("group_member_id");--> statement-breakpoint
CREATE INDEX "group_invitations_target_status_idx" ON "group_invitations" USING btree ("target_user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "group_invitations_token_hash_unique" ON "group_invitations" USING btree ("token_hash") WHERE "group_invitations"."token_hash" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "group_invitations_one_pending_per_member" ON "group_invitations" USING btree ("group_member_id") WHERE "group_invitations"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "auth_user_profiles_rollcall_id_unique" ON "auth_user_profiles" USING btree ("rollcall_id");--> statement-breakpoint
ALTER TABLE "group_members" DROP COLUMN "email";
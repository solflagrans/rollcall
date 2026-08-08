CREATE TYPE "public"."group_member_role" AS ENUM('headman', 'deputy', 'student');--> statement-breakpoint
CREATE TABLE "group_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" varchar(12) DEFAULT substring(translate(encode(uuid_send(gen_random_uuid()), 'base64'), '+/', '-_') from 1 for 12) NOT NULL,
	"group_id" uuid NOT NULL,
	"first_name" varchar(80) NOT NULL,
	"last_name" varchar(80) NOT NULL,
	"email" varchar(320),
	"role" "group_member_role" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"user_account_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_members_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "group_members_first_name_not_blank" CHECK (btrim("group_members"."first_name") <> ''),
	CONSTRAINT "group_members_last_name_not_blank" CHECK (btrim("group_members"."last_name") <> ''),
	CONSTRAINT "group_members_headman_active" CHECK ("group_members"."role" <> 'headman' OR "group_members"."is_active")
);
--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "group_members_group_id_idx" ON "group_members" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "group_members_group_active_idx" ON "group_members" USING btree ("group_id","is_active");--> statement-breakpoint
CREATE INDEX "group_members_last_name_idx" ON "group_members" USING btree ("last_name");--> statement-breakpoint
CREATE UNIQUE INDEX "group_members_group_email_unique" ON "group_members" USING btree ("group_id","email") WHERE "group_members"."email" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "group_members_one_headman_per_group" ON "group_members" USING btree ("group_id") WHERE "group_members"."role" = 'headman';
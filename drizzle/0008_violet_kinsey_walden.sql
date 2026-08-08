CREATE TABLE "auth_user_profiles" (
	"user_id" varchar(255) PRIMARY KEY NOT NULL,
	"first_name" varchar(80) NOT NULL,
	"last_name" varchar(80) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_user_profiles_first_name_not_blank" CHECK (btrim("auth_user_profiles"."first_name") <> ''),
	CONSTRAINT "auth_user_profiles_last_name_not_blank" CHECK (btrim("auth_user_profiles"."last_name") <> '')
);
--> statement-breakpoint
ALTER TABLE "group_members" RENAME COLUMN "user_account_id" TO "user_id";--> statement-breakpoint
ALTER TABLE "group_members" ALTER COLUMN "user_id" SET DATA TYPE varchar(255) USING "user_id"::text;--> statement-breakpoint
CREATE INDEX "group_members_user_id_idx" ON "group_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "group_members_group_user_unique" ON "group_members" USING btree ("group_id","user_id") WHERE "group_members"."user_id" IS NOT NULL;

CREATE TABLE "academic_period_disciplines" (
	"period_id" uuid NOT NULL,
	"discipline_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academic_period_disciplines_pk" PRIMARY KEY("period_id","discipline_id")
);
--> statement-breakpoint
CREATE TABLE "disciplines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" varchar(12) DEFAULT substring(translate(encode(uuid_send(gen_random_uuid()), 'base64'), '+/', '-_') from 1 for 12) NOT NULL,
	"group_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "disciplines_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "disciplines_name_not_blank" CHECK (btrim("disciplines"."name") <> ''),
	CONSTRAINT "disciplines_name_trimmed" CHECK ("disciplines"."name" = btrim("disciplines"."name"))
);
--> statement-breakpoint
ALTER TABLE "academic_period_disciplines" ADD CONSTRAINT "academic_period_disciplines_period_id_academic_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."academic_periods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_period_disciplines" ADD CONSTRAINT "academic_period_disciplines_discipline_id_disciplines_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disciplines" ADD CONSTRAINT "disciplines_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "academic_period_disciplines_discipline_idx" ON "academic_period_disciplines" USING btree ("discipline_id");--> statement-breakpoint
CREATE INDEX "disciplines_group_archived_idx" ON "disciplines" USING btree ("group_id","is_archived");--> statement-breakpoint
CREATE INDEX "disciplines_group_name_idx" ON "disciplines" USING btree ("group_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "disciplines_group_normalized_name_unique" ON "disciplines" USING btree ("group_id",lower(btrim("name")));
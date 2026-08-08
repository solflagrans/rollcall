CREATE TYPE "public"."attendance_status" AS ENUM('present', 'late', 'absent', 'excused');--> statement-breakpoint
CREATE TYPE "public"."lesson_type" AS ENUM('lecture', 'practice', 'laboratory', 'seminar');--> statement-breakpoint
CREATE TABLE "lesson_attendance" (
	"lesson_id" uuid NOT NULL,
	"group_member_id" uuid NOT NULL,
	"status" "attendance_status",
	"comment" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_attendance_pk" PRIMARY KEY("lesson_id","group_member_id"),
	CONSTRAINT "lesson_attendance_comment_not_blank" CHECK ("lesson_attendance"."comment" IS NULL OR btrim("lesson_attendance"."comment") <> '')
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" varchar(12) DEFAULT substring(translate(encode(uuid_send(gen_random_uuid()), 'base64'), '+/', '-_') from 1 for 12) NOT NULL,
	"period_id" uuid NOT NULL,
	"discipline_id" uuid NOT NULL,
	"lesson_date" date NOT NULL,
	"lesson_type" "lesson_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lessons_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "lesson_attendance" ADD CONSTRAINT "lesson_attendance_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_attendance" ADD CONSTRAINT "lesson_attendance_group_member_id_group_members_id_fk" FOREIGN KEY ("group_member_id") REFERENCES "public"."group_members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_period_discipline_fk" FOREIGN KEY ("period_id","discipline_id") REFERENCES "public"."academic_period_disciplines"("period_id","discipline_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lesson_attendance_member_idx" ON "lesson_attendance" USING btree ("group_member_id");--> statement-breakpoint
CREATE INDEX "lessons_period_date_idx" ON "lessons" USING btree ("period_id","lesson_date");--> statement-breakpoint
CREATE INDEX "lessons_discipline_idx" ON "lessons" USING btree ("discipline_id");
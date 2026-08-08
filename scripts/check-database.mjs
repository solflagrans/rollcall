import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Для проверки базы задайте DATABASE_URL или DATABASE_URL_UNPOOLED.");
}

const sql = neon(databaseUrl);
const [tables] = await sql`
  select
    to_regclass('public.groups')::text as groups_table,
    to_regclass('public.academic_periods')::text as periods_table,
    to_regclass('public.group_members')::text as members_table,
    to_regclass('public.disciplines')::text as disciplines_table,
    to_regclass('public.academic_period_disciplines')::text as period_disciplines_table,
    to_regclass('public.lessons')::text as lessons_table,
    to_regclass('public.lesson_attendance')::text as lesson_attendance_table
`;

if (
  !tables?.groups_table ||
  !tables?.periods_table ||
  !tables?.members_table ||
  !tables?.disciplines_table ||
  !tables?.period_disciplines_table ||
  !tables?.lessons_table ||
  !tables?.lesson_attendance_table
) {
  throw new Error("Одна или несколько таблиц Rollcall не найдены. Примените миграции.");
}

const constraints = await sql`
  select conname, contype
  from pg_constraint
  where conrelid in (
    'public.groups'::regclass,
    'public.academic_periods'::regclass,
    'public.group_members'::regclass,
    'public.disciplines'::regclass,
    'public.academic_period_disciplines'::regclass,
    'public.lessons'::regclass,
    'public.lesson_attendance'::regclass
  )
`;
const constraintNames = new Set(constraints.map(({ conname }) => conname));
const requiredConstraints = [
  "academic_periods_number_range",
  "academic_periods_date_range",
  "academic_periods_group_id_groups_id_fk",
  "academic_periods_group_dates_excl",
  "academic_periods_public_id_unique",
  "groups_public_id_unique",
  "group_members_public_id_unique",
  "group_members_first_name_not_blank",
  "group_members_last_name_not_blank",
  "group_members_headman_active",
  "group_members_email_normalized",
  "group_members_group_id_groups_id_fk",
  "disciplines_public_id_unique",
  "disciplines_name_not_blank",
  "disciplines_name_trimmed",
  "disciplines_group_id_groups_id_fk",
  "academic_period_disciplines_pk",
  "academic_period_disciplines_period_id_academic_periods_id_fk",
  "academic_period_disciplines_discipline_id_disciplines_id_fk",
  "lessons_public_id_unique",
  "lessons_period_discipline_fk",
  "lesson_attendance_pk",
  "lesson_attendance_comment_not_blank",
  "lesson_attendance_lesson_id_lessons_id_fk",
  "lesson_attendance_group_member_id_group_members_id_fk",
];
const missing = requiredConstraints.filter((name) => !constraintNames.has(name));

if (missing.length > 0) {
  throw new Error(`В базе отсутствуют ограничения: ${missing.join(", ")}.`);
}
if (constraintNames.has("academic_periods_group_number_unique")) {
  throw new Error("Устаревшее ограничение уникальности номера периода всё ещё активно.");
}

const [periodTypeColumn] = await sql`
  select is_nullable, udt_name
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'groups'
    and column_name = 'period_type'
`;

if (periodTypeColumn?.is_nullable !== "NO" || periodTypeColumn?.udt_name !== "period_type") {
  throw new Error("Колонка groups.period_type не соответствует актуальной схеме.");
}

const memberIndexes = await sql`
  select indexname
  from pg_indexes
  where schemaname = 'public' and tablename = 'group_members'
`;
const memberIndexNames = new Set(memberIndexes.map(({ indexname }) => indexname));
for (const requiredIndex of [
  "group_members_group_email_unique",
  "group_members_one_headman_per_group",
]) {
  if (!memberIndexNames.has(requiredIndex)) {
    throw new Error(`В базе отсутствует индекс ${requiredIndex}.`);
  }
}

const disciplineIndexes = await sql`
  select indexname
  from pg_indexes
  where schemaname = 'public'
    and tablename in ('disciplines', 'academic_period_disciplines')
`;
const disciplineIndexNames = new Set(disciplineIndexes.map(({ indexname }) => indexname));
for (const requiredIndex of [
  "disciplines_group_normalized_name_unique",
  "disciplines_group_archived_idx",
  "academic_period_disciplines_discipline_idx",
]) {
  if (!disciplineIndexNames.has(requiredIndex)) {
    throw new Error(`В базе отсутствует индекс ${requiredIndex}.`);
  }
}

const lessonIndexes = await sql`
  select indexname
  from pg_indexes
  where schemaname = 'public'
    and tablename in ('lessons', 'lesson_attendance')
`;
const lessonIndexNames = new Set(lessonIndexes.map(({ indexname }) => indexname));
for (const requiredIndex of [
  "lessons_period_date_idx",
  "lessons_discipline_idx",
  "lesson_attendance_member_idx",
]) {
  if (!lessonIndexNames.has(requiredIndex)) {
    throw new Error(`В базе отсутствует индекс ${requiredIndex}.`);
  }
}

const [dataIntegrity] = await sql`
  select
    (
      select count(*)::int
      from lessons lesson
      inner join academic_periods period on period.id = lesson.period_id
      where lesson.lesson_date < period.starts_on
        or lesson.lesson_date > period.ends_on
    ) as lessons_outside_period,
    (
      select count(*)::int
      from academic_period_disciplines assignment
      inner join academic_periods period on period.id = assignment.period_id
      inner join disciplines discipline on discipline.id = assignment.discipline_id
      where period.group_id <> discipline.group_id
    ) as cross_group_discipline_assignments,
    (
      select count(*)::int
      from lesson_attendance attendance
      inner join lessons lesson on lesson.id = attendance.lesson_id
      inner join academic_periods period on period.id = lesson.period_id
      inner join group_members member on member.id = attendance.group_member_id
      where period.group_id <> member.group_id
    ) as cross_group_attendance
`;

const integrityFailures = Object.entries(dataIntegrity ?? {}).filter(
  ([, count]) => Number(count) > 0,
);
if (integrityFailures.length > 0) {
  throw new Error(
    `В данных нарушены инварианты: ${integrityFailures
      .map(([name, count]) => `${name}=${count}`)
      .join(", ")}.`,
  );
}

console.log("Database schema check passed.");

import { config } from "dotenv";
import { executeSql } from "../src/server/db/runtime";

config({ path: ".env.local" });

const ids = {
  group: "10000000-0000-4000-8000-000000000001",
  period: "20000000-0000-4000-8000-000000000001",
  headmanProfile: "30000000-0000-4000-8000-000000000001",
  deputyProfile: "30000000-0000-4000-8000-000000000002",
  headman: "40000000-0000-4000-8000-000000000001",
  deputy: "40000000-0000-4000-8000-000000000002",
};

const students = [
  "Алексей Воронцов", "Мария Белова", "Илья Соколов", "Полина Лебедева", "Кирилл Морозов",
  "Анна Волкова", "Даниил Орлов", "Вера Федорова", "Роман Попов", "София Новикова",
].map((name, index) => ({
  name,
  profile: `30000000-0000-4000-8000-${String(index + 101).padStart(12, "0")}`,
  membership: `40000000-0000-4000-8000-${String(index + 101).padStart(12, "0")}`,
  email: `student${index + 1}@rollcall.test`,
}));

const subjects = [
  ["50000000-0000-4000-8000-000000000001", "Математический анализ", "Мат. анализ", "Е. А. Смирнова"],
  ["50000000-0000-4000-8000-000000000002", "Программирование", "Программирование", "А. И. Серов"],
  ["50000000-0000-4000-8000-000000000003", "Физика", "Физика", "О. В. Петрова"],
  ["50000000-0000-4000-8000-000000000004", "Иностранный язык", "Английский", "М. Д. Ким"],
];

const profiles = [
  `('${ids.headmanProfile}','demo-headman','headman@rollcall.test','Алина Крылова')`,
  `('${ids.deputyProfile}','demo-deputy','deputy@rollcall.test','Максим Тихонов')`,
  ...students.map((s, i) => `('${s.profile}','demo-student-${i + 1}','${s.email}','${s.name}')`),
].join(",");

const memberRows = [
  `('${ids.headman}','${ids.group}','${ids.headmanProfile}','headman','Алина Крылова')`,
  `('${ids.deputy}','${ids.group}','${ids.deputyProfile}','deputy','Максим Тихонов')`,
  ...students.map((s) => `('${s.membership}','${ids.group}','${s.profile}','student','${s.name}')`),
].join(",");

const subjectRows = subjects.map(([id, name, shortName, teacher]) => `('${id}','${ids.group}','${ids.period}','${name}','${shortName}','${teacher}')`).join(",");
const lessonRows = Array.from({ length: 8 }, (_, index) => {
  const id = `60000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
  const subjectId = subjects[index % subjects.length][0];
  const type = ["lecture", "practice", "laboratory"][index % 3];
  const day = String(2 + index * 3).padStart(2, "0");
  return `('${id}','${ids.group}','${ids.period}','${subjectId}','2026-09-${day}','${type}','${ids.headman}','${ids.headman}')`;
}).join(",");

const attendanceRows = Array.from({ length: 8 }, (_, lessonIndex) => students.map((student, studentIndex) => {
  const lessonId = `60000000-0000-4000-8000-${String(lessonIndex + 1).padStart(12, "0")}`;
  const status = (studentIndex + lessonIndex) % 11 === 0 ? "absent" : (studentIndex + lessonIndex) % 9 === 0 ? "late" : (studentIndex + lessonIndex) % 13 === 0 ? "excused" : "present";
  return `(gen_random_uuid(),'${lessonId}','${student.membership}','${status}')`;
}).join(",")).join(",");

async function main() {
  await executeSql(`
BEGIN;
TRUNCATE audit_logs, attendance, lessons, subjects, memberships, academic_periods, groups, profiles CASCADE;
INSERT INTO profiles (id,auth_user_id,email,display_name) VALUES ${profiles};
INSERT INTO groups (id,name,description) VALUES ('${ids.group}','ИВТ-21','Информационные системы и технологии');
INSERT INTO academic_periods (id,group_id,name,starts_on,ends_on,is_active) VALUES ('${ids.period}','${ids.group}','Осенний семестр 2026','2026-09-01','2026-12-31',true);
UPDATE groups SET active_period_id='${ids.period}' WHERE id='${ids.group}';
INSERT INTO memberships (id,group_id,profile_id,role,display_name) VALUES ${memberRows};
INSERT INTO subjects (id,group_id,academic_period_id,name,short_name,teacher) VALUES ${subjectRows};
INSERT INTO lessons (id,group_id,academic_period_id,subject_id,lesson_date,type,created_by_membership_id,updated_by_membership_id) VALUES ${lessonRows};
INSERT INTO attendance (id,lesson_id,student_membership_id,status) VALUES ${attendanceRows};
COMMIT;
`);
  console.log("Seed complete: 1 group, 12 members, 4 subjects, 8 lessons.");
  console.log("Demo accounts: headman@rollcall.test, deputy@rollcall.test, student1@rollcall.test / demo12345");
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });

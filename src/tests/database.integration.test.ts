import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";

describe("lesson transaction integration", () => {
  let database: PGlite;
  beforeAll(async () => {
    database = new PGlite();
    await database.exec(await readFile(resolve("src/server/db/migrations/0000_initial.sql"), "utf8"));
    await database.exec(`
      INSERT INTO profiles(id,auth_user_id,email,display_name) VALUES
        ('00000000-0000-4000-8000-000000000001','admin','a@test.dev','Admin'),
        ('00000000-0000-4000-8000-000000000002','student','s@test.dev','Student');
      INSERT INTO groups(id,name,period_system) VALUES ('10000000-0000-4000-8000-000000000001','Test','semester');
      INSERT INTO academic_periods(id,group_id,period_number,starts_on,ends_on) VALUES ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',1,'2026-01-01','2026-12-31');
      UPDATE groups SET active_period_id='20000000-0000-4000-8000-000000000001';
      INSERT INTO memberships(id,group_id,profile_id,role,display_name) VALUES
        ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','headman','Admin'),
        ('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','student','Student');
      INSERT INTO subjects(id,group_id,academic_period_id,name,short_name) VALUES ('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Subject','Sub');
    `);
  });
  afterAll(async () => database.close());

  it("creates a lesson, all marks and audit entry atomically", async () => {
    await database.transaction(async (tx) => {
      await tx.exec(`INSERT INTO lessons(id,group_id,academic_period_id,subject_id,lesson_date,type,created_by_membership_id,updated_by_membership_id) VALUES ('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','2026-08-06','lecture','30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001')`);
      await tx.exec(`INSERT INTO attendance(lesson_id,student_membership_id,status) VALUES ('50000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','present')`);
      await tx.exec(`INSERT INTO audit_logs(group_id,actor_membership_id,entity_type,entity_id,action) VALUES ('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','lesson','50000000-0000-4000-8000-000000000001','lesson.created')`);
    });
    const result = await database.query<{ lessons: number; marks: number; logs: number }>(`SELECT (SELECT count(*) FROM lessons)::int lessons,(SELECT count(*) FROM attendance)::int marks,(SELECT count(*) FROM audit_logs)::int logs`);
    expect(result.rows[0]).toEqual({ lessons: 1, marks: 1, logs: 1 });
  });

  it("edits a mark and enforces one mark per lesson/student", async () => {
    await database.exec(`UPDATE attendance SET status='late' WHERE lesson_id='50000000-0000-4000-8000-000000000001'`);
    const mark = await database.query<{ status: string }>(`SELECT status FROM attendance`);
    expect(mark.rows[0].status).toBe("late");
    await expect(database.exec(`INSERT INTO attendance(lesson_id,student_membership_id,status) VALUES ('50000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','absent')`)).rejects.toThrow();
  });

  it("rolls the whole transaction back on a mark failure", async () => {
    await expect(database.transaction(async (tx) => {
      await tx.exec(`INSERT INTO lessons(id,group_id,academic_period_id,subject_id,lesson_date,type,created_by_membership_id,updated_by_membership_id) VALUES ('50000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','2026-08-07','practice','30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001')`);
      await tx.exec(`INSERT INTO attendance(lesson_id,student_membership_id,status) VALUES ('50000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','invalid')`);
    })).rejects.toThrow();
    const result = await database.query<{ count: number }>(`SELECT count(*)::int count FROM lessons WHERE id='50000000-0000-4000-8000-000000000002'`);
    expect(result.rows[0].count).toBe(0);
  });
});

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";

describe("period system migration", () => {
  it("upgrades legacy periods and remains idempotent", async () => {
    const database = new PGlite();
    try {
      await database.exec(`
        CREATE TABLE groups (id uuid PRIMARY KEY, name text NOT NULL);
        CREATE TABLE academic_periods (id uuid PRIMARY KEY, group_id uuid NOT NULL REFERENCES groups(id), name text NOT NULL, starts_on date NOT NULL, ends_on date NOT NULL);
        INSERT INTO groups VALUES ('10000000-0000-4000-8000-000000000001', 'Legacy');
        INSERT INTO academic_periods VALUES ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Произвольное название', '2026-01-01', '2026-06-30');
      `);
      const migration = await readFile(resolve("src/server/db/migrations/0001_period_system.sql"), "utf8");
      await database.exec(migration);
      await database.exec(migration);

      const result = await database.query<{ period_system: string; period_number: number }>(`
        SELECT g.period_system, p.period_number
        FROM groups g JOIN academic_periods p ON p.group_id = g.id
      `);
      expect(result.rows[0]).toEqual({ period_system: "semester", period_number: 1 });

      const removed = await database.query<{ count: number }>(`
        SELECT count(*)::int count FROM information_schema.columns
        WHERE table_name = 'academic_periods' AND column_name = 'name'
      `);
      expect(removed.rows[0].count).toBe(0);
    } finally {
      await database.close();
    }
  });
});

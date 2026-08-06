DO $$ BEGIN CREATE TYPE period_system AS ENUM ('semester','trimester','quarter','year'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE groups ADD COLUMN IF NOT EXISTS period_system period_system;
UPDATE groups SET period_system = 'semester' WHERE period_system IS NULL;
ALTER TABLE groups ALTER COLUMN period_system SET NOT NULL;

ALTER TABLE academic_periods ADD COLUMN IF NOT EXISTS period_number integer;
UPDATE academic_periods SET period_number = 1 WHERE period_number IS NULL;
ALTER TABLE academic_periods ALTER COLUMN period_number SET NOT NULL;
ALTER TABLE academic_periods DROP COLUMN IF EXISTS name;

DO $$ BEGIN
  ALTER TABLE academic_periods ADD CONSTRAINT period_number_positive CHECK (period_number > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

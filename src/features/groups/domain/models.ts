import type { PeriodType } from "@/features/groups/domain/periods";

export interface Group {
  id: string;
  publicId: string;
  name: string;
  periodType: PeriodType;
  createdAt: Date;
  updatedAt: Date;
}

export interface AcademicPeriod {
  id: string;
  publicId: string;
  groupId: string;
  number: number;
  startsOn: string;
  endsOn: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupContext {
  group: Group;
  periods: AcademicPeriod[];
}

export interface GroupPeriodContext extends GroupContext {
  period?: AcademicPeriod;
}

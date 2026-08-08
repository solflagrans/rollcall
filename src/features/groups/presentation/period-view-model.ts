import type { AcademicPeriod } from "@/features/groups/domain/models";
import type { PeriodSummary } from "@/features/groups/domain/periods";

export function toPeriodSummary(period: AcademicPeriod): PeriodSummary {
  return {
    id: period.publicId,
    number: period.number,
    startsOn: period.startsOn,
    endsOn: period.endsOn,
  };
}

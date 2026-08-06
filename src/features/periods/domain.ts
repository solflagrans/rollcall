export const periodSystems = ["semester", "trimester", "quarter", "year"] as const;

export type PeriodSystem = (typeof periodSystems)[number];

export const periodSystemLabels: Record<PeriodSystem, string> = {
  semester: "По семестрам",
  trimester: "По триместрам",
  quarter: "По четвертям",
  year: "По годам",
};

const periodNouns: Record<Exclude<PeriodSystem, "year">, string> = {
  semester: "семестр",
  trimester: "триместр",
  quarter: "четверть",
};

export function formatPeriodLabel(system: PeriodSystem, number: number) {
  return system === "year" ? `${number}-й год` : `${number} ${periodNouns[system]}`;
}

export function normalizeGroupName(name: string): string {
  return name.trim().replace(/\s+/gu, " ");
}

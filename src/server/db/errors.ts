export function isDatabaseErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

export function isUniqueViolation(error: unknown): boolean {
  return isDatabaseErrorCode(error, "23505");
}

export function isForeignKeyViolation(error: unknown): boolean {
  return isDatabaseErrorCode(error, "23503");
}

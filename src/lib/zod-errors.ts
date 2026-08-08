import type { ZodError } from "zod";

export function getZodFieldErrors(
  error: ZodError,
  allowedFields: ReadonlySet<string>,
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (
      typeof field === "string" &&
      allowedFields.has(field) &&
      !fieldErrors[field]
    ) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}

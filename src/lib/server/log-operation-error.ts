import "server-only";

export function logUnexpectedOperationError(scope: string, error: unknown): void {
  const databaseUrlPattern = /postgres(?:ql)?:\/\/[^\s]+/giu;
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : undefined;

  console.error(`[${scope}] Unexpected operation error`, {
    name: error instanceof Error ? error.name : "UnknownError",
    message:
      error instanceof Error
        ? error.message.replace(databaseUrlPattern, "[database-url]")
        : "Unknown operation error",
    ...(code ? { code } : {}),
  });
}

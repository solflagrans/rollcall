import "server-only";

const defaultDelaysMs = [80, 200] as const;
const transientCodes = new Set([
  "08000",
  "08001",
  "08003",
  "08004",
  "08006",
  "08007",
  "08P01",
  "EAI_AGAIN",
  "ECONNRESET",
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
]);

type RetryOptions = {
  delaysMs?: readonly number[];
  wait?: (delayMs: number) => Promise<void>;
};

export async function readWithRetry<Result>(
  operationName: string,
  operation: () => Promise<Result>,
  options: RetryOptions = {},
): Promise<Result> {
  const delaysMs = options.delaysMs ?? defaultDelaysMs;
  const wait = options.wait ?? waitFor;

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= delaysMs.length || !isTransientDatabaseReadError(error)) {
        throw error;
      }

      console.warn("[database] Retrying transient read failure", {
        operation: operationName,
        attempt: attempt + 1,
        maxAttempts: delaysMs.length + 1,
        code: getErrorCode(error),
      });
      await wait(delaysMs[attempt]!);
    }
  }
}

export function isTransientDatabaseReadError(error: unknown): boolean {
  for (const candidate of errorChain(error)) {
    const code = getErrorCode(candidate);
    if (code && (transientCodes.has(code) || code.startsWith("08"))) return true;

    const message = candidate instanceof Error ? candidate.message : String(candidate);
    if (
      /error connecting to database|fetch failed|connection (?:closed|reset|terminated)|network error|socket hang up|timed? ?out/iu.test(
        message,
      )
    ) {
      return true;
    }
  }
  return false;
}

function errorChain(error: unknown): unknown[] {
  const chain: unknown[] = [];
  const seen = new Set<unknown>();
  const queue: unknown[] = [error];

  while (queue.length > 0 && chain.length < 6) {
    const current = queue.shift();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    chain.push(current);
    if (typeof current !== "object") continue;
    if ("cause" in current) queue.push(current.cause);
    if ("sourceError" in current) queue.push(current.sourceError);
  }
  return chain;
}

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  const code = error.code;
  return typeof code === "string" ? code : undefined;
}

function waitFor(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

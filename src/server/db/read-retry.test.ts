import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  isTransientDatabaseReadError,
  readWithRetry,
} from "@/server/db/read-retry";

describe("database read retry", () => {
  it("retries a transient nested fetch failure and returns the next result", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(
        new Error("Failed query", {
          cause: new Error("Error connecting to database: TypeError: fetch failed"),
        }),
      )
      .mockResolvedValue("ok");
    const wait = vi.fn(async () => undefined);

    await expect(
      readWithRetry("test.read", operation, { delaysMs: [10], wait }),
    ).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(10);
  });

  it("does not retry validation or constraint failures", async () => {
    const error = Object.assign(new Error("duplicate key"), { code: "23505" });
    const operation = vi.fn<() => Promise<string>>().mockRejectedValue(error);

    await expect(
      readWithRetry("test.read", operation, { delaysMs: [0, 0] }),
    ).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("recognizes connection-class PostgreSQL errors", () => {
    expect(isTransientDatabaseReadError({ code: "08006" })).toBe(true);
    expect(isTransientDatabaseReadError({ code: "23503" })).toBe(false);
  });
});

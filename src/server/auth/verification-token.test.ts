import { describe, expect, it } from "vitest";
import { createPendingVerificationToken, readPendingVerificationToken } from "./verification-token";

describe("pending email verification token", () => {
  const secret = "a-long-test-only-cookie-secret";

  it("round-trips a normalized email", () => {
    const token = createPendingVerificationToken("  Person@Example.com ", secret);
    expect(readPendingVerificationToken(token, secret)).toBe("person@example.com");
  });

  it("rejects a changed email or signature", () => {
    const token = createPendingVerificationToken("person@example.com", secret);
    const [email, signature] = token.split(".");
    const otherEmail = Buffer.from("other@example.com").toString("base64url");
    const changedSignature = `${signature.slice(0, -1)}${signature.endsWith("a") ? "b" : "a"}`;

    expect(readPendingVerificationToken(`${otherEmail}.${signature}`, secret)).toBeNull();
    expect(readPendingVerificationToken(`${email}.${changedSignature}`, secret)).toBeNull();
  });
});

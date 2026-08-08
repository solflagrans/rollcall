import { beforeEach, describe, expect, it, vi } from "vitest";

const { resetPasswordWithEmailOtp, sendVerificationOtp } = vi.hoisted(() => ({
  resetPasswordWithEmailOtp: vi.fn(),
  sendVerificationOtp: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/features/auth/server/neon-auth", () => ({
  auth: { emailOtp: { sendVerificationOtp } },
  resetPasswordWithEmailOtp,
}));
vi.mock("@/features/auth/server/authorization", () => ({
  requireGroupMembership: vi.fn(),
  saveAuthProfile: vi.fn(),
}));
vi.mock("@/features/auth/server/pending-profile", () => ({
  consumePendingAuthProfile: vi.fn(),
  setPendingAuthProfile: vi.fn(),
}));
vi.mock("@/lib/server/log-operation-error", () => ({
  logUnexpectedOperationError: vi.fn(),
}));

import {
  requestPasswordResetAction,
  resetPasswordAction,
} from "@/features/auth/actions";

describe("requestPasswordResetAction", () => {
  beforeEach(() => {
    resetPasswordWithEmailOtp.mockReset();
    resetPasswordWithEmailOtp.mockResolvedValue({
      data: { success: true },
      error: null,
    });
    sendVerificationOtp.mockReset();
    sendVerificationOtp.mockResolvedValue({ data: { success: true }, error: null });
  });

  it("requests the current Neon Auth forget-password OTP", async () => {
    const formData = new FormData();
    formData.set("email", " User@Example.com ");

    await expect(
      requestPasswordResetAction({ status: "idle" }, formData),
    ).resolves.toEqual({
      status: "success",
      redirectTo: "/auth/reset-password?email=user%40example.com",
    });
    expect(sendVerificationOtp).toHaveBeenCalledWith({
      email: "user@example.com",
      type: "forget-password",
    });
  });

  it("confirms the OTP through the current password-reset API", async () => {
    const formData = new FormData();
    formData.set("email", " User@Example.com ");
    formData.set("code", " 123456 ");
    formData.set("password", "password1");

    await expect(
      resetPasswordAction({ status: "idle" }, formData),
    ).resolves.toEqual({
      status: "success",
      redirectTo: "/auth/sign-in?notice=password-reset",
    });
    expect(resetPasswordWithEmailOtp).toHaveBeenCalledWith({
      email: "user@example.com",
      otp: "123456",
      password: "password1",
    });
  });
});

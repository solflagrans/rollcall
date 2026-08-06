// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OnboardingForm } from "./onboarding-form";

describe("OnboardingForm", () => {
  it("previews the generated period name", () => {
    render(<OnboardingForm defaultStart="2026-09-01" defaultEnd="2026-12-31" />);
    fireEvent.change(screen.getByLabelText("Как делится учебный год"), { target: { value: "quarter" } });
    fireEvent.change(screen.getByLabelText("Номер текущего периода"), { target: { value: "3" } });
    expect(screen.getByText("Будет показано как «3 четверть»")).toBeInTheDocument();
  });
});

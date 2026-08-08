import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MemberAttendanceStatistics } from "@/features/lessons/components/member-attendance-statistics";

describe("MemberAttendanceStatistics", () => {
  it("recalculates the summary and hides discipline comparison after filtering", () => {
    render(
      <MemberAttendanceStatistics
        items={[
          {
            discipline: { publicId: "mathematics", name: "Математика" },
            status: "present",
          },
          {
            discipline: { publicId: "physics", name: "Физика" },
            status: "excused",
          },
        ]}
      />,
    );

    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "По дисциплинам" }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Дисциплина"), {
      target: { value: "mathematics" },
    });

    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("посещено 1 из 1 занятий")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "По дисциплинам" }),
    ).not.toBeInTheDocument();
  });

  it("shows an explanatory empty state without a zero percentage", () => {
    render(<MemberAttendanceStatistics items={[]} />);

    expect(
      screen.getByRole("heading", {
        name: "Данных для статистики пока недостаточно",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });
});

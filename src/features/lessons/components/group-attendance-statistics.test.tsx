import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GroupAttendanceStatistics } from "@/features/lessons/components/group-attendance-statistics";

const mathematics = { publicId: "mathematics", name: "Математика" };
const physics = { publicId: "physics", name: "Физика" };

describe("GroupAttendanceStatistics", () => {
  it("recalculates all indicators for a selected discipline", () => {
    render(
      <GroupAttendanceStatistics
        lessons={[
          {
            publicId: "math",
            discipline: mathematics,
            attendance: [{ status: "present" }, { status: "late" }],
          },
          {
            publicId: "physics",
            discipline: physics,
            attendance: [{ status: "present" }, { status: "excused" }],
          },
        ]}
      />,
    );

    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("3 из 4 отметок — посещение")).toBeInTheDocument();
    expect(screen.getByText("1,5")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "По дисциплинам" }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Дисциплина"), {
      target: { value: "mathematics" },
    });

    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("2 из 2 отметок — посещение")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "По дисциплинам" }),
    ).not.toBeInTheDocument();
  });

  it("shows an empty state without a zero percentage", () => {
    render(
      <GroupAttendanceStatistics
        lessons={[
          {
            publicId: "incomplete",
            discipline: mathematics,
            attendance: [{ status: "present" }, { status: null }],
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Данных для статистики пока недостаточно",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Дисциплина")).toHaveDisplayValue(
      "Все дисциплины",
    );
  });
});

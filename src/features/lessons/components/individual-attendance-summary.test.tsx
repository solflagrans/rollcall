import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { IndividualAttendanceSummary } from "@/features/lessons/components/individual-attendance-summary";

const members = [
  {
    publicId: "active",
    firstName: "Анна",
    lastName: "Борисова",
    isActive: true,
  },
  {
    publicId: "historical",
    firstName: "Иван",
    lastName: "Алексеев",
    isActive: false,
  },
  {
    publicId: "without-data",
    firstName: "Пётр",
    lastName: "Волков",
    isActive: true,
  },
];
const mathematics = { publicId: "mathematics", name: "Математика" };
const physics = { publicId: "physics", name: "Физика" };
const lessons = [
  {
    publicId: "math",
    discipline: mathematics,
    attendance: [
      { groupMemberId: "active", status: "present" as const },
      { groupMemberId: "historical", status: "absent" as const },
    ],
  },
  {
    publicId: "physics",
    discipline: physics,
    attendance: [
      { groupMemberId: "active", status: "late" as const },
      { groupMemberId: "historical", status: "excused" as const },
    ],
  },
];

describe("IndividualAttendanceSummary", () => {
  it("shows historical and no-data rows, recalculates the selected discipline", () => {
    render(<IndividualAttendanceSummary lessons={lessons} members={members} />);

    const initialRows = screen.getAllByRole("row");
    expect(within(initialRows[1]!).getByText("Алексеев Иван")).toBeInTheDocument();
    expect(within(initialRows[1]!).getByText("Неактивен")).toBeInTheDocument();
    expect(within(initialRows[2]!).getByText("Борисова Анна")).toBeInTheDocument();
    expect(within(initialRows[3]!).getByText("Нет данных")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Дисциплина"), {
      target: { value: mathematics.publicId },
    });

    expect(
      screen.queryByRole("group", { name: "Представление сводной" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Общая" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "По дисциплинам" }),
    ).toBeDisabled();
    const filteredActiveRow = screen
      .getByText("Борисова Анна")
      .closest("tr");
    expect(filteredActiveRow).not.toBeNull();
    expect(within(filteredActiveRow!).getByText("100%")).toBeInTheDocument();
    expect(within(filteredActiveRow!).getByText("1 из 1")).toBeInTheDocument();
  });

  it("sorts the overall table and each discipline column", () => {
    render(<IndividualAttendanceSummary lessons={lessons} members={members} />);

    fireEvent.click(screen.getByRole("button", { name: "Присутствовал" }));
    expect(
      within(screen.getAllByRole("row")[1]!).getByText("Борисова Анна"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "По дисциплинам" }));
    fireEvent.click(screen.getByRole("button", { name: "Математика" }));
    expect(
      within(screen.getAllByRole("row")[1]!).getByText("Борисова Анна"),
    ).toBeInTheDocument();
    expect(
      within(screen.getAllByRole("row")[3]!).getAllByTitle("Нет данных"),
    ).toHaveLength(2);
  });

  it("shows an empty state instead of zeroes for incomplete lessons", () => {
    render(
      <IndividualAttendanceSummary
        members={members}
        lessons={[
          {
            publicId: "incomplete",
            discipline: mathematics,
            attendance: [
              { groupMemberId: "active", status: "present" },
              { groupMemberId: "historical", status: null },
            ],
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Данных для сводной пока нет" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });
});

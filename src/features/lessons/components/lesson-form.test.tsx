import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LessonForm } from "@/features/lessons/components/lesson-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/features/lessons/actions", () => ({
  createLessonAction: vi.fn(),
  updateLessonAttendanceAction: vi.fn(),
}));

const defaultProps = {
  groupId: "group",
  periodId: "period",
  startsOn: "2026-08-01",
  endsOn: "2026-08-31",
  defaultLessonDate: "2026-08-08",
  disciplines: [{ publicId: "mathematics", name: "Математика" }],
  lessonId: "lesson",
  initialLesson: {
    lessonDate: "2026-08-08",
    disciplineId: "mathematics",
    disciplineName: "Математика",
    lessonType: "lecture" as const,
  },
};

describe("LessonForm statistics", () => {
  it("switches between progress and final statistics with local attendance changes", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <LessonForm
        {...defaultProps}
        members={[
          {
            publicId: "anna",
            firstName: "Анна",
            lastName: "Иванова",
            status: "present",
          },
          {
            publicId: "petr",
            firstName: "Пётр",
            lastName: "Петров",
            status: null,
          },
        ]}
      />,
    );

    const statistics = screen.getByRole("region", {
      name: "Статистика занятия",
    });
    expect(within(statistics).getByText("Отмечено 1 из 2")).toBeInTheDocument();
    expect(within(statistics).queryByText("50%")).not.toBeInTheDocument();

    fireEvent.click(
      within(screen.getByRole("group", { name: "Статус: Петров Пётр" })).getByRole(
        "button",
        { name: "Опоздал" },
      ),
    );

    expect(within(statistics).getByText("100%")).toBeInTheDocument();
    expect(
      within(statistics).getByText("Присутствовали 2 из 2 человек"),
    ).toBeInTheDocument();
    expect(within(statistics).queryByText(/Отмечено/)).not.toBeInTheDocument();

    fireEvent.click(
      within(screen.getByRole("group", { name: "Статус: Петров Пётр" })).getByRole(
        "button",
        { name: "Опоздал" },
      ),
    );

    expect(within(statistics).getByText("Отмечено 1 из 2")).toBeInTheDocument();
    expect(within(statistics).queryByText("100%")).not.toBeInTheDocument();
    expect(
      screen.getByLabelText("Сохранение посещаемости"),
    ).toHaveTextContent("Отмечено 1 из 2");

    fireEvent.click(screen.getByRole("button", { name: "Сбросить отметки" }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(within(statistics).getByText("Отмечено 0 из 2")).toBeInTheDocument();
    confirm.mockRestore();
  });

  it("shows saved final statistics in read-only mode", () => {
    render(
      <LessonForm
        {...defaultProps}
        readOnly
        members={[
          {
            publicId: "anna",
            firstName: "Анна",
            lastName: "Иванова",
            status: "present",
          },
          {
            publicId: "petr",
            firstName: "Пётр",
            lastName: "Петров",
            status: "absent",
          },
        ]}
      />,
    );

    const statistics = screen.getByRole("region", {
      name: "Статистика занятия",
    });
    expect(within(statistics).getByText("50%")).toBeInTheDocument();
    expect(
      within(statistics).getByText("Присутствовали 1 из 2 человек"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Сбросить отметки" })).not.toBeInTheDocument();
  });
});

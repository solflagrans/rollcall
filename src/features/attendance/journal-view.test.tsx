// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { JournalView } from "./journal-view";

describe("JournalView", () => {
  it("hydrates and remains interactive with stable TanStack data", () => {
    render(<JournalView
      rows={[{ id: "lesson-1", date: "2026-08-06", type: "lecture", subjectId: "subject-1", subject: "Физика", stats: { present: 1, absent: 0, late: 0, excused: 0 } }]}
      marks={[{ lessonId: "lesson-1", studentId: "student-1", studentName: "Студент", status: "present" }]}
      students={[{ id: "student-1", name: "Студент" }]}
    />);

    expect(screen.getAllByText("Физика").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Сводная" }));
    expect(screen.getByText(/П — присутствовал/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Занятия" }));
    expect(screen.getByRole("table")).toBeInTheDocument();
  });
});

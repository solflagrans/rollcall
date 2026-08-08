import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useActionLock } from "@/lib/use-action-lock";

function LockedActionButton({ operation }: { operation: () => Promise<void> }) {
  const action = useActionLock();
  return (
    <button
      type="button"
      disabled={action.isLocked}
      onClick={() => void action.run(operation)}
    >
      Сохранить
    </button>
  );
}

describe("useActionLock", () => {
  it("runs only one operation when the control is activated twice", async () => {
    let finish!: () => void;
    const operation = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    render(<LockedActionButton operation={operation} />);
    const button = screen.getByRole("button", { name: "Сохранить" });

    fireEvent.click(button);
    fireEvent.click(button);
    expect(operation).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();

    await act(async () => finish());
    expect(button).toBeEnabled();
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ContextMenu } from "@/components/ui/context-menu";

function rectangle({
  top,
  right,
  bottom,
  left,
  width,
  height,
}: {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}): DOMRect {
  return {
    x: left,
    y: top,
    top,
    right,
    bottom,
    left,
    width,
    height,
    toJSON: () => ({}),
  };
}

describe("ContextMenu", () => {
  afterEach(() => vi.restoreAllMocks());

  it("keeps the menu inside narrow viewport margins", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        if (this.getAttribute("role") === "menu") {
          return rectangle({
            top: 0,
            right: 260,
            bottom: 140,
            left: 0,
            width: 260,
            height: 140,
          });
        }
        return rectangle({
          top: 280,
          right: 210,
          bottom: 320,
          left: 170,
          width: 40,
          height: 40,
        });
      },
    );
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 220 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 340 });

    render(
      <ContextMenu label="Действия">
        {() => <button role="menuitem">Редактировать</button>}
      </ContextMenu>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Действия" }));

    const menu = screen.getByRole("menu");
    expect(menu).toHaveStyle({ left: "16px", top: "132px", maxHeight: "308px" });
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { NumericDraftInput } from "./NumericDraftInput";

it("stays empty while replacing a one-digit value with a multi-digit value", async () => {
  const user = userEvent.setup();
  const onCommit = vi.fn();
  render(<NumericDraftInput aria-label="Rounds" value={1} min={1} onCommit={onCommit} />);
  const input = screen.getByRole("spinbutton", { name: "Rounds" });
  await user.clear(input);
  expect(input).toHaveValue(null);
  await user.type(input, "12");
  expect(input).toHaveValue(12);
  await user.tab();
  expect(onCommit).toHaveBeenLastCalledWith(12);
});

it("commits undefined for an optional empty number", async () => {
  const user = userEvent.setup();
  const onCommit = vi.fn();
  render(<NumericDraftInput aria-label="Weight" value={20} min={0} allowEmpty onCommit={onCommit} />);
  await user.clear(screen.getByRole("spinbutton", { name: "Weight" }));
  await user.tab();
  expect(onCommit).toHaveBeenLastCalledWith(undefined);
});

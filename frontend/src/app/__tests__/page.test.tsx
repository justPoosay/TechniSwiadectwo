import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Home from "../page";

test("renders Techni Świadectwo heading", () => {
  render(<Home />);
  const heading = screen.getByRole("heading", { level: 1, name: /techni świadectwo/i });
  expect(heading).toBeDefined();
});

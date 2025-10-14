import { render as testingLibraryRender } from "@testing-library/react";
import type { ReactNode } from "react";

// Custom render function that includes providers if needed
export function render(ui: ReactNode, options = {}) {
  return testingLibraryRender(<>{ui}</>, options);
}

// Re-export everything from testing-library
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";

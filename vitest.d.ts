import "vitest/globals";
import "@testing-library/jest-dom";

declare global {
  const vi: (typeof import("vitest"))["vi"];
}

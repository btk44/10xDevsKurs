import { vi } from "vitest";

// Mock the cn function from utils
export const cn = vi.fn((...inputs: any[]) => inputs.join(" "));

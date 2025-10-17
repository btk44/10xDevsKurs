// Mock the cn function from utils
export const cn = vi.fn((...inputs: unknown[]) => inputs.join(" "));

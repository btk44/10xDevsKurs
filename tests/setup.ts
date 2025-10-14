import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

// Extend Vitest's expect method with testing-library matchers
expect.extend(matchers);

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Mock Supabase client
vi.mock("../src/db/supabase.client", () => {
  return {
    createClient: vi.fn(() => ({
      auth: {
        getUser: vi.fn(),
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        resetPasswordForEmail: vi.fn(),
        updateUser: vi.fn(),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
            order: vi.fn(() => ({
              limit: vi.fn(),
            })),
          })),
          order: vi.fn(() => ({
            limit: vi.fn(),
          })),
        })),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      })),
    })),
  };
});

// Mock utils
vi.mock("@/lib/utils", () => {
  return {
    cn: (...inputs: any[]) => inputs.filter(Boolean).join(" "),
  };
});

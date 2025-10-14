import { vi } from "vitest";

export const createMockSupabaseClient = () => ({
  auth: {
    getUser: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
  },
  from: vi.fn((table) => ({
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
});

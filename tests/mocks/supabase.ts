import { vi } from "vitest";
import type { PostgrestQueryBuilder } from "@supabase/postgrest-js";

interface MockQueryBuilder {
  select: vi.MockedFunction<any>;
  insert: vi.MockedFunction<any>;
  update: vi.MockedFunction<any>;
  delete: vi.MockedFunction<any>;
  eq: vi.MockedFunction<any>;
  neq: vi.MockedFunction<any>;
  ilike: vi.MockedFunction<any>;
  order: vi.MockedFunction<any>;
  limit: vi.MockedFunction<any>;
  single: vi.MockedFunction<any>;
  head: vi.MockedFunction<any>;
  rpc: vi.MockedFunction<any>;
}

interface MockSupabaseClient {
  auth: {
    getUser: vi.MockedFunction<any>;
    signInWithPassword: vi.MockedFunction<any>;
    signUp: vi.MockedFunction<any>;
    signOut: vi.MockedFunction<any>;
    getSession: vi.MockedFunction<any>;
    resetPasswordForEmail: vi.MockedFunction<any>;
    updateUser: vi.MockedFunction<any>;
  };
  from: vi.MockedFunction<any>;
  rpc: vi.MockedFunction<any>;
}

export const createMockSupabaseClient = (): MockSupabaseClient => {
  const createQueryChain = (): MockQueryBuilder => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116", message: "No rows found" } }),
      head: vi.fn().mockResolvedValue({ count: 0, error: null }),
      rpc: vi.fn().mockReturnThis(),
    };

    // Ensure order method returns the same chain to allow chaining
    chain.order.mockReturnValue(chain);

    return chain;
  };

  const mockFrom = vi.fn((table: string) => createQueryChain());

  return {
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
    from: mockFrom,
    rpc: vi.fn(),
  };
};

export const createMockSupabaseClientWithData = () => {
  const mockClient = createMockSupabaseClient();

  // Configure common successful responses
  mockClient.from.mockImplementation((table: string) => {
    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows found" },
      }),
      head: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockReturnThis(),
    };

    // Set up count response for transaction checks
    if (table === "transactions") {
      queryBuilder.select.mockImplementation((columns?: string) => {
        if (columns === "*" && queryBuilder.head) {
          return {
            ...queryBuilder,
            head: vi.fn().mockResolvedValue({ count: 0, error: null }),
          };
        }
        return queryBuilder;
      });
    }

    return queryBuilder;
  });

  return mockClient;
};

import type { MockedFunction } from "vitest";

interface MockQueryBuilder {
  select: MockedFunction<(...args: unknown[]) => MockQueryBuilder>;
  insert: MockedFunction<(...args: unknown[]) => MockQueryBuilder>;
  update: MockedFunction<(...args: unknown[]) => MockQueryBuilder>;
  delete: MockedFunction<(...args: unknown[]) => MockQueryBuilder>;
  eq: MockedFunction<(...args: unknown[]) => MockQueryBuilder>;
  neq: MockedFunction<(...args: unknown[]) => MockQueryBuilder>;
  ilike: MockedFunction<(...args: unknown[]) => MockQueryBuilder>;
  order: MockedFunction<(...args: unknown[]) => MockQueryBuilder>;
  limit: MockedFunction<(...args: unknown[]) => MockQueryBuilder>;
  single: MockedFunction<() => Promise<unknown>>;
  head: MockedFunction<() => Promise<unknown>>;
  rpc: MockedFunction<(...args: unknown[]) => MockQueryBuilder>;
}

export interface MockSupabaseClient {
  auth: {
    getUser: MockedFunction<() => Promise<unknown>>;
    signInWithPassword: MockedFunction<(...args: unknown[]) => Promise<unknown>>;
    signUp: MockedFunction<() => Promise<unknown>>;
    signOut: MockedFunction<() => Promise<unknown>>;
    getSession: MockedFunction<() => Promise<unknown>>;
    resetPasswordForEmail: MockedFunction<(...args: unknown[]) => Promise<unknown>>;
    updateUser: MockedFunction<(...args: unknown[]) => Promise<unknown>>;
  };
  from: MockedFunction<(table: string) => MockQueryBuilder>;
  rpc: MockedFunction<(...args: unknown[]) => Promise<unknown>>;
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        if (columns === "*") {
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

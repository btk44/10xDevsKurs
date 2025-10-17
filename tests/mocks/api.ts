import type { User } from "@supabase/supabase-js";
import { createMockSupabaseClient, type MockSupabaseClient } from "./supabase";

export interface MockAPIRouteContext {
  request: Request;
  locals: {
    user?: User | null;
    supabase: MockSupabaseClient | null;
    session?: unknown;
  };
  params: Record<string, string | undefined>;
  url: URL;
  site: URL;
  generator: string;
  props: Record<string, unknown>;
  redirect: (path: string, status?: number) => Response;
  rewrite: (path: string) => Promise<Response>;
  preferredLocale: string | null;
  preferredLocaleList: string[];
  currentLocale: string;
  clientAddress: string;
  getActionResult: () => unknown;
  callAction: (action: unknown, input: unknown) => Promise<unknown>;
  getClientAddress: () => string;
  routePattern: string;
  cookies: Record<string, string>;
  originPathname: string;
  isPrerendered: boolean;
  csp: string | undefined;
}

export interface MockAPIContext {
  url: URL;
  request: Request;
  locals: {
    user?: User | null;
    supabase: ReturnType<typeof createMockSupabaseClient>;
  };
}

/**
 * Creates a mock Astro APIRoute context for testing
 */
export const createMockAPIContext = (overrides: Partial<MockAPIRouteContext> = {}): MockAPIRouteContext => {
  const defaultUrl = new URL("http://localhost:4321/api/test");

  return {
    request: new Request(defaultUrl),
    locals: {
      user: { id: "test-user-id" } as User,
      supabase: createMockSupabaseClient() as MockSupabaseClient,
      session: null,
    },
    params: {},
    url: defaultUrl,
    site: new URL("http://localhost:4321"),
    generator: "Astro v5.0.0",
    props: {},
    redirect: vi.fn(
      (path: string, status?: number) => new Response(null, { status: status || 302, headers: { Location: path } })
    ),
    rewrite: vi.fn().mockResolvedValue(new Response("Rewritten", { status: 200 })),
    preferredLocale: null,
    preferredLocaleList: [],
    currentLocale: "en",
    clientAddress: "127.0.0.1",
    getActionResult: vi.fn(() => null),
    callAction: vi.fn(),
    getClientAddress: vi.fn(() => "127.0.0.1"),
    routePattern: "/api/transactions",
    cookies: {},
    originPathname: "/api/transactions",
    isPrerendered: false,
    csp: undefined,
    ...overrides,
  };
};

/**
 * Creates a mock Astro APIContext for testing (used by categories API)
 */
export const createMockCategoriesAPIContext = (overrides: Partial<MockAPIContext> = {}): MockAPIContext => {
  const defaultUrl = new URL("http://localhost:4321/api/categories");

  return {
    url: defaultUrl,
    request: new Request(defaultUrl),
    locals: {
      user: { id: "test-user-id" } as User,
      supabase: createMockSupabaseClient() as MockSupabaseClient,
    },
    ...overrides,
  };
};

/**
 * Creates a mock authenticated context
 */
export const createMockAuthenticatedContext = (userId = "test-user-id"): MockAPIRouteContext => {
  return createMockAPIContext({
    locals: {
      user: { id: userId } as User,
      supabase: createMockSupabaseClient() as MockSupabaseClient,
    },
  });
};

/**
 * Creates a mock unauthenticated context
 */
export const createMockUnauthenticatedContext = (): MockAPIRouteContext => {
  return createMockAPIContext({
    locals: {
      user: null,
      supabase: createMockSupabaseClient() as MockSupabaseClient,
    },
  });
};

/**
 * Creates a mock request with JSON body
 */
export const createMockJSONRequest = (body: unknown, url = "http://localhost:4321/api/test"): Request => {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
};

/**
 * Creates a mock authenticated categories API context
 */
export const createMockAuthenticatedCategoriesContext = (userId = "test-user-id"): MockAPIContext => {
  return createMockCategoriesAPIContext({
    locals: {
      user: { id: userId } as User,
      supabase: createMockSupabaseClient() as MockSupabaseClient,
    },
  });
};

/**
 * Creates a mock unauthenticated categories API context
 */
export const createMockUnauthenticatedCategoriesContext = (): MockAPIContext => {
  return createMockCategoriesAPIContext({
    locals: {
      user: null,
      supabase: createMockSupabaseClient() as MockSupabaseClient,
    },
  });
};

/**
 * Creates a mock categories API context with query parameters
 */
export const createMockCategoriesContextWithQuery = (params: Record<string, string> = {}): MockAPIContext => {
  const url = new URL("http://localhost:4321/api/categories");
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return createMockCategoriesAPIContext({
    url,
    request: new Request(url),
    locals: {
      user: { id: "test-user-id" } as User,
      supabase: createMockSupabaseClient() as MockSupabaseClient,
    },
  });
};

/**
 * Creates a mock request with query parameters
 */
export const createMockRequestWithQuery = (url: string, params: Record<string, string> = {}): Request => {
  const fullUrl = url.startsWith("http") ? url : `http://localhost:4321${url}`;
  const testUrl = new URL(fullUrl);
  Object.entries(params).forEach(([key, value]) => {
    testUrl.searchParams.set(key, value);
  });

  return new Request(testUrl);
};

/**
 * Mock response helper for testing response structure
 */
export const parseResponse = async (response: Response) => {
  const text = await response.text();
  try {
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: JSON.parse(text),
    };
  } catch {
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: text,
    };
  }
};

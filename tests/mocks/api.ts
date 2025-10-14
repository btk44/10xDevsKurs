import { vi } from "vitest";
import type { APIRoute } from "astro";
import type { User } from "@supabase/supabase-js";
import { createMockSupabaseClient } from "./supabase";

export interface MockAPIRouteContext {
  request: Request;
  locals: {
    user?: User | null;
    supabase: ReturnType<typeof createMockSupabaseClient>;
  };
  params: Record<string, string | undefined>;
  url: URL;
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
      supabase: createMockSupabaseClient() as any,
    },
    params: {},
    url: defaultUrl,
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
      supabase: createMockSupabaseClient() as any,
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
      supabase: createMockSupabaseClient() as any,
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
      supabase: createMockSupabaseClient() as any,
    },
  });
};

/**
 * Creates a mock request with JSON body
 */
export const createMockJSONRequest = (body: any, url = "http://localhost:4321/api/test"): Request => {
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
      supabase: createMockSupabaseClient() as any,
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
      supabase: createMockSupabaseClient() as any,
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
      supabase: createMockSupabaseClient() as any,
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

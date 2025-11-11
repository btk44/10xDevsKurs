import { createErrorResponse } from "./response";

interface User {
  id: string;
  email: string;
}

interface Locals {
  user?: User | null;
  supabase: unknown;
}

/**
 * Ensures the user is authenticated and returns user data or an error response
 * @param locals - Astro locals containing user data
 * @returns Success result with user data or failure result with Response
 */
export function ensureAuthenticated(
  locals: Locals
): { success: true; user: User } | { success: false; response: Response } {
  if (!locals.user) {
    return {
      success: false,
      response: createErrorResponse("UNAUTHENTICATED", "Authentication required", 401),
    };
  }
  return { success: true, user: locals.user };
}

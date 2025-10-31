import { createErrorResponse } from "./response";

interface Locals {
  user?: unknown;
  supabase: unknown;
}

/**
 * Ensures Supabase client is available in locals
 * @param locals - Astro locals containing Supabase client
 * @returns Success result with Supabase client or failure result with Response
 */
export function ensureSupabaseClient(
  locals: Locals
): { success: true; supabase: unknown } | { success: false; response: Response } {
  if (!locals.supabase) {
    return {
      success: false,
      response: createErrorResponse("SERVICE_UNAVAILABLE", "Database connection not available", 503),
    };
  }
  return { success: true, supabase: locals.supabase };
}

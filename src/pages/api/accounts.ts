import type { APIRoute } from "astro";
import { AccountService } from "../../lib/services/AccountService";
import { CreateAccountCommandSchema } from "../../lib/validation/schemas";
import { validateRequestBody } from "../../lib/validation/utils";
import { ensureAuthenticated } from "../../lib/api/auth";
import { createErrorResponse, createSuccessResponse } from "../../lib/api/response";
import { parseJsonRequest } from "../../lib/api/request";
import type { AccountDTO } from "../../types";

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // Ensure user is authenticated
    const authResult = ensureAuthenticated(locals);
    if (!authResult.success) return authResult.response;

    // Extract and validate query parameters from URL
    const url = new URL(request.url);
    const includeInactiveParam = url.searchParams.get("include_inactive");

    // Validate include_inactive parameter if present
    let includeInactive = false;
    if (includeInactiveParam !== null) {
      if (includeInactiveParam === "true") {
        includeInactive = true;
      } else if (includeInactiveParam === "false") {
        includeInactive = false;
      } else {
        return createErrorResponse("VALIDATION_ERROR", "Invalid query parameters", 400, [
          {
            field: "include_inactive",
            message: "Must be 'true' or 'false'",
          },
        ]);
      }
    }

    // Initialize AccountService with Supabase client from middleware
    const accountService = new AccountService(locals.supabase);

    // Fetch accounts for the user
    const accounts = await accountService.getAccountsByUserId(authResult.user.id, includeInactive);

    // Format successful response
    return createSuccessResponse(accounts);
  } catch (error) {
    // Log the error for debugging (in production, use proper logging)
    // console.error("Error in GET /api/accounts:", error);

    // Determine error type and return appropriate response
    if (error instanceof Error) {
      // Check if it's a database-related error
      if (error.message.includes("Failed to fetch accounts")) {
        return createErrorResponse("DATABASE_ERROR", "Failed to retrieve accounts from database", 500);
      }
    }

    // Generic internal server error
    return createErrorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500);
  }
};

/**
 * POST /api/accounts
 * Creates a new account for the authenticated user
 *
 * @param request - Request object containing the account data
 * @param locals - Astro locals containing Supabase client
 * @returns {ApiResponse<AccountDTO>} Created account data
 * @throws {ApiErrorResponse} 400 for validation errors, 404 for currency not found, 500 for server errors
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Ensure user is authenticated
    const authResult = ensureAuthenticated(locals);
    if (!authResult.success) return authResult.response;

    // Parse request body
    const parseResult = await parseJsonRequest(request);
    if (!parseResult.success) return parseResult.response;
    const requestBody = parseResult.data;

    // Validate request body
    const validation = validateRequestBody(CreateAccountCommandSchema, requestBody);

    if (!validation.success) {
      return createErrorResponse("VALIDATION_ERROR", "Validation failed", 400, validation.errors);
    }

    // Initialize AccountService with Supabase client from middleware
    const accountService = new AccountService(locals.supabase);

    // Create the account
    let newAccount: AccountDTO;
    try {
      newAccount = await accountService.createAccount(validation.data, authResult.user.id);
    } catch (error) {
      if (error instanceof Error) {
        // Handle specific error cases
        if (error.message === "CURRENCY_NOT_FOUND") {
          return createErrorResponse("CURRENCY_NOT_FOUND", "Currency does not exist", 404);
        }

        if (
          error.message.includes("Failed to create account") ||
          error.message.includes("Failed to fetch created account details") ||
          error.message.includes("Failed to validate currency")
        ) {
          return createErrorResponse("DATABASE_ERROR", "Failed to create account", 500);
        }
      }

      // Generic server error
      return createErrorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500);
    }

    // Format successful response
    return createSuccessResponse(newAccount, 201);
  } catch {
    // Log the error for debugging (in production, use proper logging)
    // console.error("Error in POST /api/accounts:", error);

    // Generic internal server error
    return createErrorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500);
  }
};

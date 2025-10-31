import type { APIRoute } from "astro";
import { AccountService } from "../../../lib/services/AccountService";
import { UpdateAccountCommandSchema } from "../../../lib/validation/schemas";
import { validateRequestBody } from "../../../lib/validation/utils";
import type { ApiErrorResponse, AccountDTO, UpdateAccountCommand, ValidationErrorDetail } from "../../../types";

export const prerender = false;

interface User {
  id: string;
  email: string;
}

interface Locals {
  user?: User | null;
  supabase: unknown;
}

// Helper functions for common API operations
function ensureAuthenticated(locals: Locals): { success: true; user: User } | { success: false; response: Response } {
  if (!locals.user) {
    return { success: false, response: createErrorResponse("UNAUTHENTICATED", "Authentication required", 401) };
  }
  return { success: true, user: locals.user };
}

function createErrorResponse(
  code: string,
  message: string,
  status: number,
  details?: ValidationErrorDetail[]
): Response {
  const errorResponse: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function createSuccessResponse<T>(data: T, status = 200): Response {
  const response = { data };
  return new Response(JSON.stringify(response), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function parseJsonRequest(
  request: Request
): Promise<{ success: true; data: unknown } | { success: false; response: Response }> {
  try {
    const data = await request.json();
    return { success: true, data };
  } catch {
    return {
      success: false,
      response: createErrorResponse("INVALID_JSON", "Request body must be valid JSON", 400),
    };
  }
}

function validateAccountId(
  accountIdParam: string | undefined
): { success: true; accountId: number } | { success: false; response: Response } {
  if (!accountIdParam) {
    return { success: false, response: createErrorResponse("INVALID_ACCOUNT_ID", "Account ID is required", 400) };
  }

  let accountId: number;
  try {
    accountId = parseInt(accountIdParam, 10);

    // Validate that it's a positive integer
    if (isNaN(accountId) || accountId <= 0 || !Number.isInteger(accountId)) {
      throw new Error("Invalid format");
    }
  } catch {
    return {
      success: false,
      response: createErrorResponse("INVALID_ACCOUNT_ID", "Invalid account ID format. Must be a positive integer", 400),
    };
  }

  return { success: true, accountId };
}

/**
 * GET /api/accounts/:id
 * Retrieves a single account with calculated balance for the authenticated user
 *
 * @param params - Route parameters containing account ID
 * @param locals - Astro locals containing Supabase client
 * @returns {ApiResponse<AccountDTO>} Account data with calculated balance
 * @throws {ApiErrorResponse} 400 for invalid ID format, 404 for account not found, 500 for server errors
 */
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // Ensure user is authenticated
    const authResult = ensureAuthenticated(locals);
    if (!authResult.success) return authResult.response;

    // Validate account ID from path parameters
    const accountIdResult = validateAccountId(params.id);
    if (!accountIdResult.success) return accountIdResult.response;

    // Initialize AccountService with Supabase client from middleware
    const accountService = new AccountService(locals.supabase);

    // Fetch the account by ID
    let account: AccountDTO | null;
    try {
      account = await accountService.getAccountById(accountIdResult.accountId, authResult.user.id);
    } catch (error) {
      // Log the error for debugging (in production, use proper logging)
      // console.error("Error retrieving account:", error);

      if (error instanceof Error) {
        // Check if it's a database-related error
        if (error.message.includes("Failed to retrieve account")) {
          return createErrorResponse("DATABASE_ERROR", "Failed to retrieve account from database", 500);
        }
      }

      // Generic database error
      return createErrorResponse("DATABASE_ERROR", "Internal server error", 500);
    }

    // Check if account was found
    if (!account) {
      return createErrorResponse("ACCOUNT_NOT_FOUND", "Account not found", 404);
    }

    // Format successful response
    return createSuccessResponse(account);
  } catch {
    // Log the error for debugging (in production, use proper logging)
    // console.error("Error in GET /api/accounts/:id:", error);

    // Generic internal server error
    return createErrorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500);
  }
};

/**
 * PATCH /api/accounts/:id
 * Updates an existing account for the authenticated user
 *
 * @param params - Route parameters containing account ID
 * @param request - Request object containing the account update data
 * @param locals - Astro locals containing Supabase client
 * @returns {ApiResponse<AccountDTO>} Updated account data with calculated balance
 * @throws {ApiErrorResponse} 400 for validation errors, 404 for account not found, 500 for server errors
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    // Ensure user is authenticated
    const authResult = ensureAuthenticated(locals);
    if (!authResult.success) return authResult.response;

    // Validate account ID from path parameters
    const accountIdResult = validateAccountId(params.id);
    if (!accountIdResult.success) return accountIdResult.response;

    // Parse request body
    const parseResult = await parseJsonRequest(request);
    if (!parseResult.success) return parseResult.response;
    const requestBody = parseResult.data;

    // Validate request body against UpdateAccountCommand schema
    const validation = validateRequestBody(UpdateAccountCommandSchema, requestBody);

    if (!validation.success) {
      return createErrorResponse("VALIDATION_ERROR", "Validation failed", 400, validation.errors);
    }

    const updateCommand: UpdateAccountCommand = validation.data;

    // Initialize AccountService with Supabase client from middleware
    const accountService = new AccountService(locals.supabase);

    // Update the account
    let updatedAccount: AccountDTO;
    try {
      updatedAccount = await accountService.updateAccount(accountIdResult.accountId, updateCommand, authResult.user.id);
    } catch (error) {
      // Handle specific error cases
      if (error instanceof Error) {
        // Account not found or access denied
        if (error.message.includes("Account not found") || error.message.includes("access denied")) {
          return createErrorResponse("ACCOUNT_NOT_FOUND", "Account not found", 404);
        }

        // Currency validation error
        if (error.message.includes("CURRENCY_NOT_FOUND")) {
          return createErrorResponse("CURRENCY_NOT_FOUND", "Currency not found", 400, [
            {
              field: "currency_id",
              message: "The specified currency does not exist",
            },
          ]);
        }

        // Database-related errors
        if (error.message.includes("Failed to update account")) {
          return createErrorResponse("DATABASE_ERROR", "Failed to update account", 500);
        }
      }

      // Generic database error
      return createErrorResponse("DATABASE_ERROR", "Internal server error", 500);
    }

    // Format successful response
    return createSuccessResponse(updatedAccount);
  } catch {
    // Generic internal server error for any unexpected errors
    return createErrorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500);
  }
};

/**
 * DELETE /api/accounts/:id
 * Soft deletes an account and all its related transactions for the authenticated user
 * Sets the account's active flag to false and cascades this to related transactions
 *
 * @param params - Route parameters containing account ID
 * @param locals - Astro locals containing Supabase client
 * @returns 204 No Content on success
 * @throws {ApiErrorResponse} 400 for invalid ID format, 404 for account not found, 500 for server errors
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    // Ensure user is authenticated
    const authResult = ensureAuthenticated(locals);
    if (!authResult.success) return authResult.response;

    // Validate account ID from path parameters
    const accountIdResult = validateAccountId(params.id);
    if (!accountIdResult.success) return accountIdResult.response;

    // Initialize AccountService with Supabase client from middleware
    const accountService = new AccountService(locals.supabase);

    // Soft delete the account and related transactions
    try {
      await accountService.softDeleteAccount(accountIdResult.accountId, authResult.user.id);
    } catch (error) {
      // Handle specific error cases
      if (error instanceof Error) {
        // Account not found or access denied
        if (error.message === "ACCOUNT_NOT_FOUND") {
          return createErrorResponse("ACCOUNT_NOT_FOUND", "Account not found or access denied", 404);
        }

        // Database-related errors
        if (error.message.includes("Failed to")) {
          return createErrorResponse("DATABASE_ERROR", "Failed to delete account", 500);
        }
      }

      // Generic database error
      return createErrorResponse("DATABASE_ERROR", "Internal server error", 500);
    }

    // Return 204 No Content on successful deletion
    return new Response(null, {
      status: 204,
    });
  } catch {
    // Generic internal server error for any unexpected errors
    return createErrorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500);
  }
};

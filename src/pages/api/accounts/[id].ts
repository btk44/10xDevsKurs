import type { APIRoute } from "astro";
import { AccountService } from "../../../lib/services/AccountService";
import { UpdateAccountCommandSchema } from "../../../lib/validation/schemas";
import { validateRequestBody } from "../../../lib/validation/utils";
import type { ApiResponse, ApiErrorResponse, AccountDTO, UpdateAccountCommand } from "../../../types";

export const prerender = false;

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
    if (!locals.user) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Extract and validate account ID from path parameters
    const accountIdParam = params.id;

    if (!accountIdParam) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "INVALID_ACCOUNT_ID",
          message: "Account ID is required",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse and validate account ID as positive integer
    let accountId: number;
    try {
      accountId = parseInt(accountIdParam, 10);

      // Validate that it's a positive integer
      if (isNaN(accountId) || accountId <= 0 || !Number.isInteger(accountId)) {
        throw new Error("Invalid format");
      }
    } catch {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "INVALID_ACCOUNT_ID",
          message: "Invalid account ID format. Must be a positive integer",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Initialize AccountService with Supabase client from middleware
    const accountService = new AccountService(locals.supabase);

    // Fetch the account by ID
    let account: AccountDTO | null;
    try {
      account = await accountService.getAccountById(accountId, locals.user.id);
    } catch (error) {
      // Log the error for debugging (in production, use proper logging)
      // console.error("Error retrieving account:", error);

      if (error instanceof Error) {
        // Check if it's a database-related error
        if (error.message.includes("Failed to retrieve account")) {
          const errorResponse: ApiErrorResponse = {
            error: {
              code: "DATABASE_ERROR",
              message: "Failed to retrieve account from database",
            },
          };
          return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      // Generic database error
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "DATABASE_ERROR",
          message: "Internal server error",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if account was found
    if (!account) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "ACCOUNT_NOT_FOUND",
          message: "Account not found",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Format successful response
    const response: ApiResponse<AccountDTO> = {
      data: account,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    // Log the error for debugging (in production, use proper logging)
    // console.error("Error in GET /api/accounts/:id:", error);

    // Generic internal server error
    const errorResponse: ApiErrorResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
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
    if (!locals.user) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Extract and validate account ID from path parameters
    const accountIdParam = params.id;

    if (!accountIdParam) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "INVALID_ACCOUNT_ID",
          message: "Account ID is required",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse and validate account ID as positive integer
    let accountId: number;
    try {
      accountId = parseInt(accountIdParam, 10);

      // Validate that it's a positive integer
      if (isNaN(accountId) || accountId <= 0 || !Number.isInteger(accountId)) {
        throw new Error("Invalid format");
      }
    } catch {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "INVALID_ACCOUNT_ID",
          message: "Invalid account ID format. Must be a positive integer",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse request body
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "INVALID_JSON",
          message: "Request body must be valid JSON",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate request body against UpdateAccountCommand schema
    const validation = validateRequestBody(UpdateAccountCommandSchema, requestBody);

    if (!validation.success) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: validation.errors,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const updateCommand: UpdateAccountCommand = validation.data;

    // Initialize AccountService with Supabase client from middleware
    const accountService = new AccountService(locals.supabase);

    // Update the account
    let updatedAccount: AccountDTO;
    try {
      updatedAccount = await accountService.updateAccount(accountId, updateCommand, locals.user.id);
    } catch (error) {
      // Handle specific error cases
      if (error instanceof Error) {
        // Account not found or access denied
        if (error.message.includes("Account not found") || error.message.includes("access denied")) {
          const errorResponse: ApiErrorResponse = {
            error: {
              code: "ACCOUNT_NOT_FOUND",
              message: "Account not found",
            },
          };
          return new Response(JSON.stringify(errorResponse), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Currency validation error
        if (error.message.includes("CURRENCY_NOT_FOUND")) {
          const errorResponse: ApiErrorResponse = {
            error: {
              code: "CURRENCY_NOT_FOUND",
              message: "Currency not found",
              details: [
                {
                  field: "currency_id",
                  message: "The specified currency does not exist",
                },
              ],
            },
          };
          return new Response(JSON.stringify(errorResponse), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Database-related errors
        if (error.message.includes("Failed to update account")) {
          const errorResponse: ApiErrorResponse = {
            error: {
              code: "DATABASE_ERROR",
              message: "Failed to update account",
            },
          };
          return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      // Generic database error
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "DATABASE_ERROR",
          message: "Internal server error",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Format successful response
    const response: ApiResponse<AccountDTO> = {
      data: updatedAccount,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    // Generic internal server error for any unexpected errors
    const errorResponse: ApiErrorResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
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
    if (!locals.user) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Extract and validate account ID from path parameters
    const accountIdParam = params.id;

    if (!accountIdParam) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "INVALID_ACCOUNT_ID",
          message: "Account ID is required",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse and validate account ID as positive integer
    let accountId: number;
    try {
      accountId = parseInt(accountIdParam, 10);

      // Validate that it's a positive integer
      if (isNaN(accountId) || accountId <= 0 || !Number.isInteger(accountId)) {
        throw new Error("Invalid format");
      }
    } catch {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "INVALID_ACCOUNT_ID",
          message: "Invalid account ID format. Must be a positive integer",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Initialize AccountService with Supabase client from middleware
    const accountService = new AccountService(locals.supabase);

    // Soft delete the account and related transactions
    try {
      await accountService.softDeleteAccount(accountId, locals.user.id);
    } catch (error) {
      // Handle specific error cases
      if (error instanceof Error) {
        // Account not found or access denied
        if (error.message === "ACCOUNT_NOT_FOUND") {
          const errorResponse: ApiErrorResponse = {
            error: {
              code: "ACCOUNT_NOT_FOUND",
              message: "Account not found or access denied",
            },
          };
          return new Response(JSON.stringify(errorResponse), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Database-related errors
        if (error.message.includes("Failed to")) {
          const errorResponse: ApiErrorResponse = {
            error: {
              code: "DATABASE_ERROR",
              message: "Failed to delete account",
            },
          };
          return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      // Generic database error
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "DATABASE_ERROR",
          message: "Internal server error",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Return 204 No Content on successful deletion
    return new Response(null, {
      status: 204,
    });
  } catch {
    // Generic internal server error for any unexpected errors
    const errorResponse: ApiErrorResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

import type { APIRoute } from "astro";
import { AccountService } from "../../lib/services/AccountService";
import { CreateAccountCommandSchema } from "../../lib/validation/schemas";
import { validateRequestBody } from "../../lib/validation/utils";
import type { ApiCollectionResponse, ApiErrorResponse, AccountDTO, ApiResponse } from "../../types";

// Temporary constant for user ID until authentication is implemented
const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  try {
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
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters",
            details: [
              {
                field: "include_inactive",
                message: "Must be 'true' or 'false'",
              },
            ],
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Initialize AccountService with Supabase client from middleware
    const accountService = new AccountService(locals.supabase);

    // Fetch accounts for the user
    const accounts = await accountService.getAccountsByUserId(DEFAULT_USER_ID, includeInactive);

    // Format successful response
    const response: ApiCollectionResponse<AccountDTO> = {
      data: accounts,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Log the error for debugging (in production, use proper logging)
    // console.error("Error in GET /api/accounts:", error);

    // Determine error type and return appropriate response
    if (error instanceof Error) {
      // Check if it's a database-related error
      if (error.message.includes("Failed to fetch accounts")) {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to retrieve accounts from database",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

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

    // Validate request body
    const validation = validateRequestBody(CreateAccountCommandSchema, requestBody);

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

    // Initialize AccountService with Supabase client from middleware
    const accountService = new AccountService(locals.supabase);

    // Create the account
    let newAccount: AccountDTO;
    try {
      newAccount = await accountService.createAccount(validation.data, DEFAULT_USER_ID);
    } catch (error) {
      if (error instanceof Error) {
        // Handle specific error cases
        if (error.message === "CURRENCY_NOT_FOUND") {
          const errorResponse: ApiErrorResponse = {
            error: {
              code: "CURRENCY_NOT_FOUND",
              message: "Currency does not exist",
            },
          };
          return new Response(JSON.stringify(errorResponse), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (
          error.message.includes("Failed to create account") ||
          error.message.includes("Failed to fetch created account details") ||
          error.message.includes("Failed to validate currency")
        ) {
          const errorResponse: ApiErrorResponse = {
            error: {
              code: "DATABASE_ERROR",
              message: "Failed to create account",
            },
          };
          return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      // Generic server error
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

    // Format successful response
    const response: ApiResponse<AccountDTO> = {
      data: newAccount,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    // Log the error for debugging (in production, use proper logging)
    // console.error("Error in POST /api/accounts:", error);

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

import type { APIRoute } from "astro";
import { TransactionService } from "../../../lib/services/TransactionService";
import {
  UpdateTransactionCommandSchema,
  IdParamSchema,
  DeleteTransactionParamsSchema,
} from "../../../lib/validation/schemas";
import { formatZodErrors } from "../../../lib/validation/utils";
import type {
  UpdateTransactionCommand,
  ApiResponse,
  ApiErrorResponse,
  TransactionDTO,
  ValidationErrorDetail,
} from "../../../types";

export const prerender = false;

/**
 * Error factory for creating consistent API error responses
 */
class TransactionAPIError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = "TransactionAPIError";
  }
}

/**
 * Maps service errors to appropriate API errors with enhanced context
 */
function mapServiceErrorToAPIError(error: Error): TransactionAPIError {
  const message = error.message;

  // Business validation errors (400 Bad Request)
  if (message.includes("not found") || message.includes("not accessible")) {
    return new TransactionAPIError("RESOURCE_NOT_FOUND", message, 400);
  }

  if (message.includes("access denied") || message.includes("Access denied")) {
    return new TransactionAPIError("ACCESS_DENIED", message, 404); // Return 404 for security
  }

  if (message.includes("no longer exists")) {
    return new TransactionAPIError("INVALID_REFERENCE", message, 400);
  }

  if (message.includes("Invalid transaction data")) {
    return new TransactionAPIError("DATA_INTEGRITY_ERROR", message, 500);
  }

  // Database schema errors (500 Internal Server Error)
  if (message.includes("Database schema error")) {
    return new TransactionAPIError("DATABASE_SCHEMA_ERROR", "Database configuration error", 500);
  }

  // Access denied errors (403 Forbidden)
  if (message.includes("insufficient permissions")) {
    return new TransactionAPIError("ACCESS_DENIED", "Access denied: insufficient permissions", 403);
  }

  // Server errors (500 Internal Server Error)
  if (message.includes("Failed to update transaction") || message.includes("Failed to verify")) {
    return new TransactionAPIError("DATABASE_ERROR", "Database operation failed", 500);
  }

  // Delete operation specific errors
  if (message.includes("Failed to delete transaction")) {
    return new TransactionAPIError("DATABASE_ERROR", "Database operation failed", 500);
  }

  if (message.includes("Transaction not found or access denied")) {
    return new TransactionAPIError("TRANSACTION_NOT_FOUND", "Transaction not found", 404);
  }

  // Default to internal server error
  return new TransactionAPIError("INTERNAL_ERROR", "An unexpected error occurred", 500);
}

/**
 * Enhanced logging utility for transaction operations
 * Note: Logging implementation removed for production compliance
 */
const TransactionLogger = {
  /**
   * Logs transaction retrieval attempts for monitoring
   */
  logGetAttempt(): void {
    // In production, this should be sent to a proper logging service
    // Implementation removed for production compliance
  },

  /**
   * Logs transaction update attempts for monitoring
   */
  logUpdateAttempt(): void {
    // In production, this should be sent to a proper logging service
    // Implementation removed for production compliance
  },

  /**
   * Logs transaction deletion attempts for monitoring
   */
  logDeleteAttempt(): void {
    // In production, this should be sent to a proper logging service
    // Implementation removed for production compliance
  },

  /**
   * Logs security-related events for monitoring
   */
  logSecurityEvent(): void {
    // In production, security events should always be logged
    // Implementation removed for production compliance
  },
};

/**
 * GET /api/transactions/:id
 * Retrieves a single transaction by its ID with enriched data including account name,
 * category name/type, and currency code. This endpoint enforces user data isolation
 * through Row Level Security (RLS) and returns detailed transaction information.
 *
 * @param context - Astro API context containing params and locals
 * @returns 200 OK with TransactionDTO on success, error responses on failure
 */
export const GET: APIRoute = async ({ params, locals }) => {
  const startTime = Date.now();

  // Ensure user is authenticated
  if (!locals.user) {
    return TransactionAPIError.createResponse("UNAUTHENTICATED", "Authentication required", 401);
  }

  const userId = locals.user.id;
  let transactionId: number | null = null;

  try {
    // Validate path parameter
    const idValidation = IdParamSchema.safeParse(params.id);
    if (!idValidation.success) {
      const validationErrors = formatZodErrors(idValidation.error);
      throw new TransactionAPIError("INVALID_TRANSACTION_ID", "Invalid transaction ID", 400, validationErrors);
    }

    transactionId = idValidation.data;

    // Validate supabase client availability
    const supabase = locals.supabase;
    if (!supabase) {
      throw new TransactionAPIError("SERVICE_UNAVAILABLE", "Database connection not available", 503);
    }

    // Additional security validations
    if (transactionId <= 0 || transactionId > Number.MAX_SAFE_INTEGER) {
      TransactionLogger.logSecurityEvent();
      throw new TransactionAPIError("INVALID_TRANSACTION_ID", "Transaction ID out of valid range", 400);
    }

    // Create transaction service and execute retrieval with monitoring
    const transactionService = new TransactionService(supabase);

    try {
      const transaction = await transactionService.getTransactionById(transactionId, userId);

      // Check if transaction was found
      if (!transaction) {
        throw new TransactionAPIError("TRANSACTION_NOT_FOUND", "Transaction not found", 404);
      }

      // Track performance
      const duration = Date.now() - startTime;

      // Log successful retrieval
      TransactionLogger.logGetAttempt();

      // Return successful response with security headers
      return new Response(
        JSON.stringify({
          data: transaction,
        } satisfies ApiResponse<TransactionDTO>),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Response-Time": `${duration}ms`,
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        }
      );
    } catch (serviceError) {
      // Map service errors to API errors
      const apiError = mapServiceErrorToAPIError(serviceError as Error);

      // Log failed retrieval
      TransactionLogger.logGetAttempt();

      throw apiError;
    }
  } catch (error) {
    // Handle all errors consistently
    let apiError: TransactionAPIError;

    if (error instanceof TransactionAPIError) {
      apiError = error;
    } else {
      // Unexpected error - log for debugging but don't expose internals
      // Logging removed for production compliance
      TransactionLogger.logSecurityEvent();
      apiError = new TransactionAPIError("INTERNAL_ERROR", "Internal server error", 500);
    }

    // Log error with context
    if (transactionId !== null) {
      TransactionLogger.logGetAttempt();
    }

    // Log error details for monitoring
    if (apiError.statusCode >= 500) {
      TransactionLogger.logSecurityEvent();
    }

    // Return error response with security headers
    const errorDetails = apiError.details as Record<string, unknown> | ValidationErrorDetail[] | undefined;
    const errorResponse: ApiErrorResponse = {
      error: {
        code: apiError.code,
        message: apiError.message,
        details: errorDetails,
      },
    };

    const responseHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Response-Time": `${Date.now() - startTime}ms`,
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: apiError.statusCode,
      headers: responseHeaders,
    });
  }
};

export const PATCH: APIRoute = async ({ request, params, locals }) => {
  const startTime = Date.now();

  // Ensure user is authenticated
  if (!locals.user) {
    return TransactionAPIError.createResponse("UNAUTHENTICATED", "Authentication required", 401);
  }

  const userId = locals.user.id;
  let command: UpdateTransactionCommand | null = null;
  let transactionId: number | null = null;

  try {
    // Validate path parameter
    const idValidation = IdParamSchema.safeParse(params.id);
    if (!idValidation.success) {
      const validationErrors = formatZodErrors(idValidation.error);
      throw new TransactionAPIError("INVALID_TRANSACTION_ID", "Invalid transaction ID", 400, validationErrors);
    }

    transactionId = idValidation.data;

    // Validate request size to prevent DoS attacks
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 10000) {
      // 10KB limit
      throw new TransactionAPIError("PAYLOAD_TOO_LARGE", "Request payload exceeds maximum allowed size", 413);
    }

    // Parse request body with enhanced error handling
    let requestBody;
    try {
      const bodyText = await request.text();
      if (!bodyText.trim()) {
        throw new TransactionAPIError("EMPTY_BODY", "Request body cannot be empty", 400);
      }
      requestBody = JSON.parse(bodyText);
    } catch (jsonError) {
      if (jsonError instanceof TransactionAPIError) {
        throw jsonError;
      }
      throw new TransactionAPIError("INVALID_JSON", "Invalid JSON in request body", 400);
    }

    // Additional security: validate request body structure
    if (typeof requestBody !== "object" || requestBody === null || Array.isArray(requestBody)) {
      throw new TransactionAPIError("INVALID_REQUEST_STRUCTURE", "Request body must be a valid object", 400);
    }

    // Check if request body is empty (no fields to update)
    if (Object.keys(requestBody).length === 0) {
      throw new TransactionAPIError("NO_FIELDS_TO_UPDATE", "At least one field must be provided for update", 400);
    }

    // Validate request body against schema with detailed error mapping
    const validationResult = UpdateTransactionCommandSchema.safeParse(requestBody);
    if (!validationResult.success) {
      const validationErrors = formatZodErrors(validationResult.error);
      throw new TransactionAPIError("VALIDATION_ERROR", "Validation failed", 400, validationErrors);
    }

    command = validationResult.data;

    // Validate supabase client availability
    const supabase = locals.supabase;
    if (!supabase) {
      throw new TransactionAPIError("SERVICE_UNAVAILABLE", "Database connection not available", 503);
    }

    // Additional security validations
    if (transactionId <= 0 || transactionId > Number.MAX_SAFE_INTEGER) {
      TransactionLogger.logSecurityEvent();
      throw new TransactionAPIError("INVALID_TRANSACTION_ID", "Transaction ID out of valid range", 400);
    }

    // Create transaction service and execute update with monitoring
    const transactionService = new TransactionService(supabase);

    try {
      const updatedTransaction = await transactionService.updateTransaction(command, transactionId, userId);

      // Track performance
      const duration = Date.now() - startTime;

      // Log successful update
      TransactionLogger.logUpdateAttempt();

      // Return successful response with security headers
      return new Response(
        JSON.stringify({
          data: updatedTransaction,
        } satisfies ApiResponse<TransactionDTO>),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Response-Time": `${duration}ms`,
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        }
      );
    } catch (serviceError) {
      // Map service errors to API errors
      const apiError = mapServiceErrorToAPIError(serviceError as Error);

      // Log failed update
      TransactionLogger.logUpdateAttempt();

      throw apiError;
    }
  } catch (error) {
    // Handle all errors consistently
    let apiError: TransactionAPIError;

    if (error instanceof TransactionAPIError) {
      apiError = error;
    } else {
      // Unexpected error - log for debugging but don't expose internals
      // Logging removed for production compliance
      TransactionLogger.logSecurityEvent();
      apiError = new TransactionAPIError("INTERNAL_ERROR", "Internal server error", 500);
    }

    // Log error with context
    if (command && transactionId !== null) {
      TransactionLogger.logUpdateAttempt();
    }

    // Log error details for monitoring
    if (apiError.statusCode >= 500) {
      TransactionLogger.logSecurityEvent();
    }

    // Return error response with security headers
    const errorDetails = apiError.details as Record<string, unknown> | ValidationErrorDetail[] | undefined;
    const errorResponse: ApiErrorResponse = {
      error: {
        code: apiError.code,
        message: apiError.message,
        details: errorDetails,
      },
    };

    const responseHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Response-Time": `${Date.now() - startTime}ms`,
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: apiError.statusCode,
      headers: responseHeaders,
    });
  }
};

/**
 * DELETE /api/transactions/:id
 * Performs soft delete on a transaction by setting active = false
 * This preserves the transaction for audit purposes while excluding it from business operations
 *
 * @param context - Astro API context containing params and locals
 * @returns 204 No Content on success, error responses on failure
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  const startTime = Date.now();

  // Ensure user is authenticated
  if (!locals.user) {
    return TransactionAPIError.createResponse("UNAUTHENTICATED", "Authentication required", 401);
  }

  const userId = locals.user.id;
  let transactionId: number | null = null;

  try {
    // Validate parameters using the dedicated schema
    const validationResult = DeleteTransactionParamsSchema.safeParse(params);
    if (!validationResult.success) {
      const validationErrors = formatZodErrors(validationResult.error);
      throw new TransactionAPIError(
        "INVALID_TRANSACTION_ID",
        "Transaction ID must be a positive integer",
        400,
        validationErrors
      );
    }

    transactionId = validationResult.data.id;

    // Validate supabase client availability
    const supabase = locals.supabase;
    if (!supabase) {
      throw new TransactionAPIError("SERVICE_UNAVAILABLE", "Database connection not available", 503);
    }

    // Additional security validations
    if (transactionId <= 0 || transactionId > Number.MAX_SAFE_INTEGER) {
      TransactionLogger.logSecurityEvent();
      throw new TransactionAPIError("INVALID_TRANSACTION_ID", "Transaction ID out of valid range", 400);
    }

    // Perform soft delete using TransactionService
    try {
      await TransactionService.deleteTransaction(transactionId, userId, supabase);

      // Track performance
      const duration = Date.now() - startTime;

      // Log successful deletion
      TransactionLogger.logDeleteAttempt();

      // Return 204 No Content on successful deletion
      return new Response(null, {
        status: 204,
        headers: {
          "X-Response-Time": `${duration}ms`,
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    } catch (serviceError) {
      // Map service errors to API errors
      const apiError = mapServiceErrorToAPIError(serviceError as Error);

      // Log failed deletion
      TransactionLogger.logDeleteAttempt();

      throw apiError;
    }
  } catch (error) {
    // Handle all errors consistently
    let apiError: TransactionAPIError;

    if (error instanceof TransactionAPIError) {
      apiError = error;
    } else {
      // Unexpected error - log for debugging but don't expose internals
      // Logging removed for production compliance
      TransactionLogger.logSecurityEvent();
      apiError = new TransactionAPIError("INTERNAL_ERROR", "Internal server error", 500);
    }

    // Log error with context
    if (transactionId !== null) {
      TransactionLogger.logDeleteAttempt();
    }

    // Log error details for monitoring
    if (apiError.statusCode >= 500) {
      TransactionLogger.logSecurityEvent();
    }

    // Return error response with security headers
    const errorDetails = apiError.details as Record<string, unknown> | ValidationErrorDetail[] | undefined;
    const errorResponse: ApiErrorResponse = {
      error: {
        code: apiError.code,
        message: apiError.message,
        details: errorDetails,
      },
    };

    const responseHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Response-Time": `${Date.now() - startTime}ms`,
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: apiError.statusCode,
      headers: responseHeaders,
    });
  }
};

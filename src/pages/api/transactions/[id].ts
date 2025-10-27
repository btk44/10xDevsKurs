import type { APIRoute } from "astro";
import { TransactionService } from "../../../lib/services/TransactionService";
import {
  UpdateTransactionCommandSchema,
  IdParamSchema,
  DeleteTransactionParamsSchema,
} from "../../../lib/validation/schemas";
import { formatZodErrors } from "../../../lib/validation/utils";
import type { UpdateTransactionCommand, ApiErrorResponse, TransactionDTO, ValidationErrorDetail } from "../../../types";
import type { supabaseClient } from "@/db/supabase.client";

export const prerender = false;

interface User {
  id: string;
  email: string;
}

// Helper functions for common API operations
function ensureAuthenticated(
  locals: App.Locals
): { success: true; user: User } | { success: false; response: Response } {
  if (!locals.user) {
    return {
      success: false,
      response: TransactionAPIError.createResponse("UNAUTHENTICATED", "Authentication required", 401),
    };
  }
  return { success: true, user: locals.user };
}

function createErrorResponse(
  code: string,
  message: string,
  status: number,
  details?: ValidationErrorDetail[],
  startTime?: number
): Response {
  const errorResponse: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Cache-Control": "no-cache, no-store, must-revalidate",
  };

  if (startTime) {
    headers["X-Response-Time"] = `${Date.now() - startTime}ms`;
  }

  return new Response(JSON.stringify(errorResponse), {
    status,
    headers,
  });
}

function createSuccessResponse<T>(
  data: T,
  status = 200,
  startTime?: number,
  additionalHeaders?: Record<string, string>,
  wrapInData = true
): Response {
  const response = wrapInData ? { data } : data;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    ...additionalHeaders,
  };

  if (startTime) {
    headers["X-Response-Time"] = `${Date.now() - startTime}ms`;
  }

  return new Response(JSON.stringify(response), {
    status,
    headers,
  });
}

async function parseJsonRequest(
  request: Request
): Promise<{ success: true; data: unknown } | { success: false; response: Response }> {
  try {
    // Validate request size to prevent DoS attacks
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 10000) {
      // 10KB limit
      return {
        success: false,
        response: TransactionAPIError.createResponse(
          "PAYLOAD_TOO_LARGE",
          "Request payload exceeds maximum allowed size",
          413
        ),
      };
    }

    const bodyText = await request.text();
    if (!bodyText.trim()) {
      return {
        success: false,
        response: TransactionAPIError.createResponse("EMPTY_BODY", "Request body cannot be empty", 400),
      };
    }

    const data = JSON.parse(bodyText);

    // Additional security: validate request body structure
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      return {
        success: false,
        response: TransactionAPIError.createResponse(
          "INVALID_REQUEST_STRUCTURE",
          "Request body must be a valid object",
          400
        ),
      };
    }

    return { success: true, data };
  } catch (error) {
    if (error instanceof TransactionAPIError) {
      return {
        success: false,
        response: TransactionAPIError.createResponse(error.code, error.message, error.statusCode),
      };
    }
    return {
      success: false,
      response: TransactionAPIError.createResponse("INVALID_JSON", "Invalid JSON in request body", 400),
    };
  }
}

function ensureSupabaseClient(
  locals: App.Locals
): { success: true; supabase: unknown } | { success: false; response: Response } {
  if (!locals.supabase) {
    return {
      success: false,
      response: TransactionAPIError.createResponse("SERVICE_UNAVAILABLE", "Database connection not available", 503),
    };
  }
  return { success: true, supabase: locals.supabase };
}

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

  /**
   * Creates a standardized error response
   */
  static createResponse(code: string, message: string, statusCode: number, details?: unknown): Response {
    const errorResponse = {
      error: {
        code,
        message,
        details,
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: statusCode,
      headers: {
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
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
 */
const TransactionLogger = {
  /**
   * Logs transaction query attempts with performance metrics
   */
  logQueryAttempt(
    userId: string,
    query: { id: number },
    success: boolean,
    duration: number,
    error?: string,
    operation = "GET_TRANSACTION"
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      operation,
      userId,
      query,
      performance: {
        duration_ms: duration,
        slow_query: duration > 1000,
      },
      result: {
        success,
        error: error ? { message: error } : undefined,
      },
    };

    // In production, this should be sent to a proper logging service (e.g., Winston, Pino)
    if (!success) {
      console.error("Transaction operation failed:", JSON.stringify(logEntry, null, 2));
    } else if (duration > 2000) {
      console.warn("Slow transaction operation:", JSON.stringify(logEntry, null, 2));
    }

    // For now, we'll track successful operations silently
    // In production: send to monitoring service (DataDog, New Relic, etc.)
  },

  /**
   * Logs security-related events for monitoring
   */
  logSecurityEvent(
    userId: string,
    event: string,
    details: Record<string, unknown>,
    severity: "low" | "medium" | "high" = "medium"
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: "SECURITY_EVENT",
      userId,
      event,
      severity,
      details,
    };

    // In production, security events should always be logged
    if (severity === "high") {
      console.error("High severity security event:", JSON.stringify(logEntry, null, 2));
    } else {
      console.warn("Security event:", JSON.stringify(logEntry, null, 2));
    }
  },
};

/**
 * Logs transaction update attempts for monitoring
 */
function logTransactionUpdate(
  userId: string,
  command: UpdateTransactionCommand,
  success: boolean,
  error?: string
): void {
  // In production, this should be sent to a proper logging service
  // For now, we'll just track the attempt without console output
  if (!success && error) {
    // Log to error tracking service in production
    // Could track: userId, command fields, error
  }
}

/**
 * Logs transaction deletion attempts for monitoring
 */
function logTransactionDeletion(userId: string, transactionId: number, success: boolean, error?: string): void {
  // In production, this should be sent to a proper logging service
  // For now, we'll just track the attempt without console output
  if (!success && error) {
    // Log to error tracking service in production
    // Could track: userId, transactionId, error
  }
}

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
  const authResult = ensureAuthenticated(locals);
  if (!authResult.success) {
    return authResult.response;
  }

  const userId = authResult.user.id;
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
    const supabaseResult = ensureSupabaseClient(locals);
    if (!supabaseResult.success) {
      throw new TransactionAPIError("SERVICE_UNAVAILABLE", "Database connection not available", 503);
    }
    const supabase = supabaseResult.supabase as typeof supabaseClient;

    // Additional security validations
    if (transactionId <= 0 || transactionId > Number.MAX_SAFE_INTEGER) {
      TransactionLogger.logSecurityEvent(userId, "INVALID_TRANSACTION_ID_RANGE", { transactionId }, "medium");
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
      TransactionLogger.logQueryAttempt(userId, { id: transactionId }, true, duration, undefined, "GET_TRANSACTION");

      // Return successful response with security headers
      return createSuccessResponse(transaction satisfies TransactionDTO, 200, startTime);
    } catch (serviceError) {
      // Track performance for failed operations
      const duration = Date.now() - startTime;

      // Log failed retrieval
      TransactionLogger.logQueryAttempt(
        userId,
        { id: transactionId },
        false,
        duration,
        (serviceError as Error).message,
        "GET_TRANSACTION"
      );

      // If it's already a TransactionAPIError, re-throw it
      if (serviceError instanceof TransactionAPIError) {
        throw serviceError;
      }

      // Map service errors to API errors
      const apiError = mapServiceErrorToAPIError(serviceError as Error);
      throw apiError;
    }
  } catch (error) {
    // Handle all errors consistently
    let apiError: TransactionAPIError;

    if (error instanceof TransactionAPIError) {
      apiError = error;
    } else {
      // Unexpected error - log for debugging but don't expose internals
      console.error("Unexpected error in GET /api/transactions/[id]:", error);
      TransactionLogger.logSecurityEvent(userId, "UNEXPECTED_ERROR", { error: String(error) }, "high");
      apiError = new TransactionAPIError("INTERNAL_ERROR", "Internal server error", 500);
    }

    // Log error details for monitoring
    if (apiError.statusCode >= 500) {
      TransactionLogger.logSecurityEvent(
        userId,
        "SERVER_ERROR",
        {
          code: apiError.code,
          message: apiError.message,
          statusCode: apiError.statusCode,
          transactionId,
        },
        "high"
      );
    }

    // Return error response with security headers
    const errorDetails = apiError.details as ValidationErrorDetail[] | undefined;
    return createErrorResponse(apiError.code, apiError.message, apiError.statusCode, errorDetails, startTime);
  }
};

export const PATCH: APIRoute = async ({ request, params, locals }) => {
  const startTime = Date.now();

  // Ensure user is authenticated
  const authResult = ensureAuthenticated(locals);
  if (!authResult.success) {
    return authResult.response;
  }

  const userId = authResult.user.id;
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

    // Parse request body
    const parseResult = await parseJsonRequest(request);
    if (!parseResult.success) {
      return parseResult.response;
    }
    const requestBody = parseResult.data;

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

    command = validationResult.data as UpdateTransactionCommand;

    // Validate supabase client availability
    const supabaseResult = ensureSupabaseClient(locals);
    if (!supabaseResult.success) {
      throw new TransactionAPIError("SERVICE_UNAVAILABLE", "Database connection not available", 503);
    }
    const supabase = supabaseResult.supabase as typeof supabaseClient;

    // Additional security validations
    if (transactionId <= 0 || transactionId > Number.MAX_SAFE_INTEGER) {
      TransactionLogger.logSecurityEvent(userId, "INVALID_TRANSACTION_ID_RANGE", { transactionId }, "medium");
      throw new TransactionAPIError("INVALID_TRANSACTION_ID", "Transaction ID out of valid range", 400);
    }

    // Create transaction service and execute update with monitoring
    const transactionService = new TransactionService(supabase);

    try {
      const updatedTransaction = await transactionService.updateTransaction(command, transactionId, userId);

      // Log successful update
      logTransactionUpdate(userId, command, true);

      // Return successful response with security headers
      return createSuccessResponse(updatedTransaction satisfies TransactionDTO, 200, startTime);
    } catch (serviceError) {
      // Map service errors to API errors
      const apiError = mapServiceErrorToAPIError(serviceError as Error);

      // Log failed update
      logTransactionUpdate(userId, command, false, apiError.message);

      throw apiError;
    }
  } catch (error) {
    // Handle all errors consistently
    let apiError: TransactionAPIError;

    if (error instanceof TransactionAPIError) {
      apiError = error;
    } else {
      // Unexpected error
      console.error("Unexpected error in PATCH /api/transactions/[id]:", error);
      TransactionLogger.logSecurityEvent(userId, "UNEXPECTED_ERROR", { error: String(error) }, "high");
      apiError = new TransactionAPIError("INTERNAL_ERROR", "Internal server error", 500);
    }

    // Log error with context
    if (command) {
      logTransactionUpdate(userId, command, false, apiError.message);
    }

    // Log error details for monitoring
    if (apiError.statusCode >= 500) {
      TransactionLogger.logSecurityEvent(
        userId,
        "SERVER_ERROR",
        {
          code: apiError.code,
          message: apiError.message,
          statusCode: apiError.statusCode,
          transactionId,
        },
        "high"
      );
    }

    // Return error response with security headers
    const errorDetails = apiError.details as ValidationErrorDetail[] | undefined;
    return createErrorResponse(apiError.code, apiError.message, apiError.statusCode, errorDetails, startTime);
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
  const authResult = ensureAuthenticated(locals);
  if (!authResult.success) {
    return authResult.response;
  }

  const userId = authResult.user.id;
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
    const supabaseResult = ensureSupabaseClient(locals);
    if (!supabaseResult.success) {
      throw new TransactionAPIError("SERVICE_UNAVAILABLE", "Database connection not available", 503);
    }
    const supabase = supabaseResult.supabase as typeof supabaseClient;

    // Additional security validations
    if (transactionId <= 0 || transactionId > Number.MAX_SAFE_INTEGER) {
      TransactionLogger.logSecurityEvent(userId, "INVALID_TRANSACTION_ID_RANGE", { transactionId }, "medium");
      throw new TransactionAPIError("INVALID_TRANSACTION_ID", "Transaction ID out of valid range", 400);
    }

    // Perform soft delete using TransactionService
    try {
      await TransactionService.deleteTransaction(transactionId, userId, supabase);

      // Log successful deletion
      logTransactionDeletion(userId, transactionId, true);

      // Return 204 No Content on successful deletion
      return createSuccessResponse(null, 204, startTime, {}, false);
    } catch (serviceError) {
      // Map service errors to API errors
      const apiError = mapServiceErrorToAPIError(serviceError as Error);

      // Log failed deletion
      logTransactionDeletion(userId, transactionId, false, apiError.message);

      throw apiError;
    }
  } catch (error) {
    // Handle all errors consistently
    let apiError: TransactionAPIError;

    if (error instanceof TransactionAPIError) {
      apiError = error;
    } else {
      // Unexpected error - log for debugging but don't expose internals
      console.error("Unexpected error in DELETE /api/transactions/[id]:", error);
      TransactionLogger.logSecurityEvent(userId, "UNEXPECTED_ERROR", { error: String(error) }, "high");
      apiError = new TransactionAPIError("INTERNAL_ERROR", "Internal server error", 500);
    }

    // Log error with context
    if (transactionId !== null) {
      logTransactionDeletion(userId, transactionId, false, apiError.message);
    }

    // Log error details for monitoring
    if (apiError.statusCode >= 500) {
      TransactionLogger.logSecurityEvent(
        userId,
        "SERVER_ERROR",
        {
          code: apiError.code,
          message: apiError.message,
          statusCode: apiError.statusCode,
          transactionId,
        },
        "high"
      );
    }

    // Return error response with security headers
    const errorDetails = apiError.details as ValidationErrorDetail[] | undefined;
    return createErrorResponse(apiError.code, apiError.message, apiError.statusCode, errorDetails, startTime);
  }
};

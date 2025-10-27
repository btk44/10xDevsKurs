import type { APIRoute } from "astro";
import { TransactionService } from "../../lib/services/TransactionService";
import { CreateTransactionCommandSchema, GetTransactionsQuerySchema } from "../../lib/validation/schemas";
import { formatZodErrors } from "../../lib/validation/utils";
import type {
  CreateTransactionCommand,
  GetTransactionsQuery,
  ApiCollectionResponse,
  ApiErrorResponse,
  TransactionDTO,
  ValidationErrorDetail,
} from "../../types";
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
  if (message.includes("Transaction not found or access denied")) {
    return new TransactionAPIError("TRANSACTION_NOT_FOUND", "Transaction not found", 404);
  }

  if (message.includes("not found") || message.includes("not accessible")) {
    return new TransactionAPIError("RESOURCE_NOT_FOUND", message, 400);
  }

  if (message.includes("already exists")) {
    return new TransactionAPIError("DUPLICATE_RESOURCE", message, 409);
  }

  if (message.includes("no longer exists")) {
    return new TransactionAPIError("INVALID_REFERENCE", message, 400);
  }

  if (message.includes("Invalid date range")) {
    return new TransactionAPIError("INVALID_DATE_RANGE", message, 400);
  }

  if (message.includes("does not exist")) {
    return new TransactionAPIError("PAGE_NOT_FOUND", message, 404);
  }

  if (message.includes("Invalid transaction data")) {
    return new TransactionAPIError("DATA_INTEGRITY_ERROR", message, 500);
  }

  // Database schema errors (500 Internal Server Error)
  if (message.includes("Database schema error")) {
    return new TransactionAPIError("DATABASE_SCHEMA_ERROR", "Database configuration error", 500);
  }

  // Access denied errors (403 Forbidden)
  if (message.includes("Access denied") || message.includes("insufficient permissions")) {
    return new TransactionAPIError("ACCESS_DENIED", "Access denied: insufficient permissions", 403);
  }

  // Server errors (500 Internal Server Error)
  if (
    message.includes("Failed to create transaction") ||
    message.includes("Failed to fetch") ||
    message.includes("Database connection")
  ) {
    return new TransactionAPIError("DATABASE_ERROR", "Database operation failed", 500);
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
    query: GetTransactionsQuery,
    success: boolean,
    duration: number,
    error?: string,
    resultCount?: number
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      operation: "GET_TRANSACTIONS",
      userId,
      query: {
        page: query.page,
        limit: query.limit,
        hasFilters: !!(query.date_from || query.date_to || query.account_id || query.category_id || query.search),
        sort: query.sort,
      },
      performance: {
        duration_ms: duration,
        slow_query: duration > 1000,
      },
      result: {
        success,
        count: resultCount,
        error: error ? { message: error } : undefined,
      },
    };

    // In production, this should be sent to a proper logging service (e.g., Winston, Pino)
    if (!success) {
      console.error("Transaction query failed:", JSON.stringify(logEntry, null, 2));
    } else if (duration > 2000) {
      console.warn("Slow transaction query:", JSON.stringify(logEntry, null, 2));
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
 * Logs transaction creation attempts for monitoring
 */
function logTransactionCreation(
  userId: string,
  command: CreateTransactionCommand,
  success: boolean,
  error?: string
): void {
  // In production, this should be sent to a proper logging service
  // For now, we'll just track the attempt without console output
  if (!success && error) {
    // Log to error tracking service in production
    // Could track: userId, command.account_id, command.category_id, command.amount, error
  }
}

export const GET: APIRoute = async ({ request, locals }) => {
  const startTime = Date.now();

  // Ensure user is authenticated
  const authResult = ensureAuthenticated(locals);
  if (!authResult.success) {
    return authResult.response;
  }

  const userId = authResult.user.id;

  try {
    // Parse URL query parameters
    const url = new URL(request.url);
    const queryParams: Record<string, string> = {};
    // Extract all query parameters
    for (const [key, value] of url.searchParams.entries()) {
      queryParams[key] = value;
    }

    // Validate query parameters against schema
    const validationResult = GetTransactionsQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      const validationErrors = formatZodErrors(validationResult.error);
      throw new TransactionAPIError("INVALID_PARAMETERS", "Invalid query parameters", 400, validationErrors);
    }

    const query: GetTransactionsQuery = validationResult.data;

    // Validate supabase client availability
    const supabaseResult = ensureSupabaseClient(locals);
    if (!supabaseResult.success) {
      throw new TransactionAPIError("SERVICE_UNAVAILABLE", "Database connection not available", 503);
    }
    const supabase = supabaseResult.supabase as typeof supabaseClient;

    // Enhanced pagination validation
    const page = query.page || 1;

    // Prevent unreasonable pagination requests
    if (page > 10000) {
      throw new TransactionAPIError(
        "PAGINATION_LIMIT_EXCEEDED",
        "Page number too high. Maximum allowed page is 10000",
        400
      );
    }

    // Additional validation for date range
    if (query.date_from && query.date_to) {
      const dateFrom = new Date(query.date_from);
      const dateTo = new Date(query.date_to);
      if (dateFrom > dateTo) {
        throw new TransactionAPIError("INVALID_DATE_RANGE", "Date from cannot be later than date to", 400);
      }

      // Prevent excessively large date ranges (performance consideration)
      const daysDifference = (dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDifference > 3650) {
        // More than 10 years
        throw new TransactionAPIError("DATE_RANGE_TOO_LARGE", "Date range cannot exceed 10 years", 400);
      }
    }

    // Validate search term length
    if (query.search && query.search.length > 100) {
      TransactionLogger.logSecurityEvent(
        userId,
        "SEARCH_TERM_TOO_LONG",
        { searchLength: query.search.length },
        "medium"
      );
      throw new TransactionAPIError("SEARCH_TERM_TOO_LONG", "Search term cannot exceed 100 characters", 400);
    }

    // Log potential security concerns
    if (page > 1000) {
      TransactionLogger.logSecurityEvent(userId, "HIGH_PAGE_NUMBER_REQUEST", { requestedPage: page }, "low");
    }

    // Create transaction service and execute query
    const transactionService = new TransactionService(supabase);

    try {
      const result = await transactionService.getTransactions(query, userId);

      // Handle empty results gracefully
      if (result.data.length === 0 && page > 1 && result.pagination) {
        // Check if this is an invalid page number for existing data
        if (result.pagination.total_items > 0) {
          const maxValidPage = result.pagination.total_pages;
          throw new TransactionAPIError(
            "PAGE_NOT_FOUND",
            `Requested page ${page} does not exist. Maximum available page: ${maxValidPage}`,
            404
          );
        }
      }

      // Track performance
      const duration = Date.now() - startTime;

      // Log the successful query attempt
      TransactionLogger.logQueryAttempt(userId, query, true, duration, undefined, result.data.length);

      // Add performance warning header for slow queries
      const additionalHeaders: Record<string, string> = {};
      if (duration > 2000) {
        additionalHeaders["X-Performance-Warning"] = "Query execution time exceeded 2 seconds";
      }

      // Return successful response with enhanced headers
      return createSuccessResponse(
        result satisfies ApiCollectionResponse<TransactionDTO>,
        200,
        startTime,
        additionalHeaders,
        false
      );
    } catch (serviceError) {
      // Log the failed query attempt
      const duration = Date.now() - startTime;
      TransactionLogger.logQueryAttempt(userId, query, false, duration, (serviceError as Error).message);

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
      console.error("Unexpected error in GET /api/transactions:", error);
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
        },
        "high"
      );
    }

    // Return error response with security headers
    const errorDetails = apiError.details as ValidationErrorDetail[] | undefined;
    return createErrorResponse(apiError.code, apiError.message, apiError.statusCode, errorDetails, startTime);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const startTime = Date.now();

  // Ensure user is authenticated
  const authResult = ensureAuthenticated(locals);
  if (!authResult.success) {
    return authResult.response;
  }

  const userId = authResult.user.id;
  let command: CreateTransactionCommand | null = null;

  try {
    // Parse request body
    const parseResult = await parseJsonRequest(request);
    if (!parseResult.success) {
      return parseResult.response;
    }
    const requestBody = parseResult.data;

    // Validate request body against schema with detailed error mapping
    const validationResult = CreateTransactionCommandSchema.safeParse(requestBody);
    if (!validationResult.success) {
      const validationErrors = formatZodErrors(validationResult.error);
      throw new TransactionAPIError("VALIDATION_ERROR", "Validation failed", 400, validationErrors);
    }

    command = validationResult.data as CreateTransactionCommand;

    // Validate supabase client availability
    const supabaseResult = ensureSupabaseClient(locals);
    if (!supabaseResult.success) {
      throw new TransactionAPIError("SERVICE_UNAVAILABLE", "Database connection not available", 503);
    }
    const supabase = supabaseResult.supabase;

    // Create transaction service and execute creation with monitoring
    const transactionService = new TransactionService(supabase as typeof supabaseClient);

    try {
      const createdTransaction = await transactionService.create(command, userId);

      // Log successful creation
      logTransactionCreation(userId, command, true);

      // Return successful response with security headers
      return createSuccessResponse(createdTransaction satisfies TransactionDTO, 201, startTime);
    } catch (serviceError) {
      // Map service errors to API errors
      const apiError = mapServiceErrorToAPIError(serviceError as Error);

      // Log failed creation
      logTransactionCreation(userId, command, false, apiError.message);

      throw apiError;
    }
  } catch (error) {
    // Handle all errors consistently
    let apiError: TransactionAPIError;

    if (error instanceof TransactionAPIError) {
      apiError = error;
    } else {
      // Unexpected error
      apiError = new TransactionAPIError("INTERNAL_ERROR", "Internal server error", 500);
    }

    // Log error with context
    if (command) {
      logTransactionCreation(userId, command, false, apiError.message);
    }

    // Return error response with security headers
    const errorDetails = apiError.details as ValidationErrorDetail[] | undefined;
    return createErrorResponse(apiError.code, apiError.message, apiError.statusCode, errorDetails, startTime);
  }
};

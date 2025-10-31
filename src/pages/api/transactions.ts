import type { APIRoute } from "astro";
import { TransactionService } from "../../lib/services/TransactionService";
import { CreateTransactionCommandSchema, GetTransactionsQuerySchema } from "../../lib/validation/schemas";
import { formatZodErrors } from "../../lib/validation/utils";
import { ensureAuthenticated } from "../../lib/api/auth";
import { createErrorResponse, createSuccessResponse } from "../../lib/api/response";
import { parseJsonRequest } from "../../lib/api/request";
import { ensureSupabaseClient } from "../../lib/api/database";
import { TransactionAPIError, mapServiceErrorToAPIError } from "../../lib/api/error-transaction";
import { TransactionLogger, logTransactionCreation } from "../../lib/api/logging-transaction";
import type {
  CreateTransactionCommand,
  GetTransactionsQuery,
  ApiCollectionResponse,
  TransactionDTO,
  ValidationErrorDetail,
} from "../../types";
import type { supabaseClient } from "@/db/supabase.client";

export const prerender = false;

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

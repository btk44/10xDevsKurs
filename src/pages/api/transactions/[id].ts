import type { APIRoute } from "astro";
import { TransactionService } from "../../../lib/services/TransactionService";
import {
  UpdateTransactionCommandSchema,
  IdParamSchema,
  DeleteTransactionParamsSchema,
} from "../../../lib/validation/schemas";
import { formatZodErrors } from "../../../lib/validation/utils";
import { ensureAuthenticated } from "../../../lib/api/auth";
import { createErrorResponse, createSuccessResponse } from "../../../lib/api/response";
import { parseJsonRequest } from "../../../lib/api/request";
import { ensureSupabaseClient } from "../../../lib/api/database";
import { TransactionAPIError, mapServiceErrorToAPIError } from "../../../lib/api/error-transaction";
import { TransactionLogger, logTransactionUpdate, logTransactionDeletion } from "../../../lib/api/logging-transaction";
import type { UpdateTransactionCommand, TransactionDTO, ValidationErrorDetail } from "../../../types";
import type { supabaseClient } from "@/db/supabase.client";

export const prerender = false;

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
      TransactionLogger.logQueryAttempt(userId, { id: transactionId }, true, duration, undefined, 1, "GET_TRANSACTION");

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
        undefined,
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
    if (
      typeof requestBody === "object" &&
      requestBody !== null &&
      !Array.isArray(requestBody) &&
      Object.keys(requestBody).length === 0
    ) {
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
      const transactionService = new TransactionService(supabase);
      await transactionService.deleteTransaction(transactionId, userId);

      // Log successful deletion
      logTransactionDeletion(userId, transactionId, true);

      // Return 204 No Content on successful deletion
      return createSuccessResponse(null, 200, startTime, {}, false);
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

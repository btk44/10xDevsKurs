/**
 * Error factory for creating consistent API error responses
 */
export class TransactionAPIError extends Error {
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
export function mapServiceErrorToAPIError(error: Error): TransactionAPIError {
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

  // Update operation specific errors
  if (message.includes("Failed to update transaction") || message.includes("Failed to verify")) {
    return new TransactionAPIError("DATABASE_ERROR", "Database operation failed", 500);
  }

  // Delete operation specific errors
  if (message.includes("Failed to delete transaction")) {
    return new TransactionAPIError("DATABASE_ERROR", "Database operation failed", 500);
  }

  // Default to internal server error
  return new TransactionAPIError("INTERNAL_ERROR", "An unexpected error occurred", 500);
}

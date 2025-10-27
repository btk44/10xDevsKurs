import type { ApiErrorResponse, ApiCollectionResponse, ValidationErrorDetail } from "../../types";

/**
 * Creates a standardized error response
 * @param code - Error code
 * @param message - Error message
 * @param status - HTTP status code
 * @param details - Optional validation error details
 * @param startTime - Optional start time for response time header
 * @returns Response object
 */
export function createErrorResponse(
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

/**
 * Creates a standardized success response
 * @param data - Response data
 * @param status - HTTP status code (default: 200)
 * @param startTime - Optional start time for response time header
 * @param additionalHeaders - Optional additional headers
 * @param wrapInData - Whether to wrap response in { data } (default: true)
 * @returns Response object
 */
export function createSuccessResponse<T>(
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

/**
 * Creates a standardized collection success response
 * @param data - Array of response data
 * @param status - HTTP status code (default: 200)
 * @returns Response object
 */
export function createCollectionSuccessResponse<T>(data: T[], status = 200): Response {
  const response: ApiCollectionResponse<T> = { data };
  return new Response(JSON.stringify(response), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

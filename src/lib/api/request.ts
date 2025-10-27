import { createErrorResponse } from "./response";

/**
 * Parses JSON request body with validation and security checks
 * @param request - Request object
 * @returns Success result with parsed data or failure result with Response
 */
export async function parseJsonRequest(
  request: Request
): Promise<{ success: true; data: unknown } | { success: false; response: Response }> {
  try {
    // Validate request size to prevent DoS attacks
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 10000) {
      // 10KB limit
      return {
        success: false,
        response: createErrorResponse("PAYLOAD_TOO_LARGE", "Request payload exceeds maximum allowed size", 413),
      };
    }

    const bodyText = await request.text();
    if (!bodyText.trim()) {
      return {
        success: false,
        response: createErrorResponse("EMPTY_BODY", "Request body cannot be empty", 400),
      };
    }

    const data = JSON.parse(bodyText);

    // Additional security: validate request body structure
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      return {
        success: false,
        response: createErrorResponse("INVALID_REQUEST_STRUCTURE", "Request body must be a valid object", 400),
      };
    }

    return { success: true, data };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        success: false,
        response: createErrorResponse("INVALID_JSON", "Request body must be valid JSON", 400),
      };
    }
    return {
      success: false,
      response: createErrorResponse("INVALID_JSON", "Request body must be valid JSON", 400),
    };
  }
}

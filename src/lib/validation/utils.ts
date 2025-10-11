import { z } from "zod";
import type { ValidationErrorDetail } from "../../types";

/**
 * Converts Zod validation errors to our standard ValidationErrorDetail format
 * @param error - ZodError instance
 * @returns Array of ValidationErrorDetail objects
 */
export function formatZodErrors(error: z.ZodError): ValidationErrorDetail[] {
  return error.errors.map((err) => ({
    field: err.path.join(".") || "unknown",
    message: err.message,
  }));
}

/**
 * Validates data using a Zod schema and returns formatted validation errors
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validation result with success flag and either data or errors
 */
export function validateWithZod<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: ValidationErrorDetail[] } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: formatZodErrors(error) };
    }

    // Fallback for non-Zod errors
    return {
      success: false,
      errors: [
        {
          field: "unknown",
          message: "Invalid data format",
        },
      ],
    };
  }
}

/**
 * Validates query parameters from URL search params
 * @param schema - Zod schema to validate against
 * @param searchParams - URLSearchParams object
 * @returns Validation result with success flag and either data or errors
 */
export function validateQueryParams<T>(
  schema: z.ZodSchema<T>,
  searchParams: URLSearchParams
): { success: true; data: T } | { success: false; errors: ValidationErrorDetail[] } {
  const queryParams = Object.fromEntries(searchParams.entries());
  return validateWithZod(schema, queryParams);
}

/**
 * Validates JSON request body
 * @param schema - Zod schema to validate against
 * @param body - Request body (already parsed JSON)
 * @returns Validation result with success flag and either data or errors
 */
export function validateRequestBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): { success: true; data: T } | { success: false; errors: ValidationErrorDetail[] } {
  return validateWithZod(schema, body);
}

/**
 * Validates URL path parameters
 * @param schema - Zod schema to validate against
 * @param params - Path parameters object
 * @returns Validation result with success flag and either data or errors
 */
export function validatePathParams<T>(
  schema: z.ZodSchema<T>,
  params: Record<string, string | undefined>
): { success: true; data: T } | { success: false; errors: ValidationErrorDetail[] } {
  return validateWithZod(schema, params);
}

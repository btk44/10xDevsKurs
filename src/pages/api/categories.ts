import type { APIContext } from "astro";
import { CategoryService } from "../../lib/services/CategoryService";
import { CreateCategoryCommandSchema, GetCategoriesQuerySchema } from "../../lib/validation/schemas";
import { ensureAuthenticated } from "../../lib/api/auth";
import { createErrorResponse, createSuccessResponse, createCollectionSuccessResponse } from "../../lib/api/response";
import type { ApiErrorResponse, CategoryDTO, GetCategoriesQuery } from "../../types";

export const prerender = false;

/**
 * GET /api/categories - Retrieve categories
 * Retrieves all categories belonging to the authenticated user with optional filtering
 */
export async function GET({ url, locals }: APIContext & { locals: App.Locals }): Promise<Response> {
  try {
    // Ensure user is authenticated
    const authResult = ensureAuthenticated(locals);
    if (!authResult.success) return authResult.response;

    // Parse query parameters from URL with null safety
    const searchParams = url.searchParams;
    const queryParams = {
      type: searchParams.get("type") || undefined,
      parent_id: searchParams.get("parent_id") || undefined,
      include_inactive: searchParams.get("include_inactive") || undefined,
    };

    // Remove undefined values to avoid validation issues
    const cleanedParams = Object.fromEntries(Object.entries(queryParams).filter(([, value]) => value !== undefined));

    // Validate query parameters using Zod schema
    const validation = GetCategoriesQuerySchema.safeParse(cleanedParams);
    if (!validation.success) {
      // Create more specific error messages for common validation failures
      const details = validation.error.errors.map((err) => {
        const field = err.path.join(".");
        let message = err.message;

        // Provide more user-friendly error messages
        if (field === "type" && err.code === "invalid_enum_value") {
          message = "Category type must be either 'income' or 'expense'";
        } else if (field === "parent_id") {
          if (err.message.includes("Expected number")) {
            message = "Parent ID must be a valid number";
          } else if (err.message.includes("Parent ID must be >= 0")) {
            message = "Parent ID must be 0 or greater (0 for main categories)";
          }
        } else if (field === "include_inactive") {
          message = "Include inactive must be 'true' or 'false'";
        }

        return {
          field,
          message,
        };
      });

      return createErrorResponse("VALIDATION_ERROR", "Invalid query parameters provided", 400, details);
    }

    // Create category service instance
    const categoryService = new CategoryService(locals.supabase);

    // Retrieve categories with filtering
    const categories: CategoryDTO[] = await categoryService.getCategories(
      validation.data as GetCategoriesQuery,
      authResult.user.id
    );

    // Return success response with proper handling of empty results
    return createCollectionSuccessResponse(categories); // Will be empty array if no categories found
  } catch (error) {
    // Handle specific service errors
    if (error instanceof Error) {
      // Handle validation errors from service layer
      if (error.message.includes("Valid user ID is required")) {
        return createErrorResponse("INVALID_USER_ID", "Invalid user identification", 401);
      }

      // Handle database connection errors
      if (error.message.includes("Failed to retrieve categories")) {
        return createErrorResponse("DATABASE_ERROR", "Unable to retrieve categories at this time", 503);
      }

      // Handle Supabase-specific errors
      if (error.message.includes("JWT") || error.message.includes("auth")) {
        return createErrorResponse("AUTHENTICATION_ERROR", "Authentication failed", 401);
      }
    }

    // Handle unexpected errors
    // TODO: Replace with proper logging service in production
    // console.error("Unexpected error in GET /api/categories:", error);
    const errorResponse: ApiErrorResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
        details: error instanceof Error ? { message: error.message } : undefined,
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * POST /api/categories - Create a new category
 * Creates a new expense or income category with support for 2-level hierarchical organization
 */
export async function POST({ request, locals }: APIContext & { locals: App.Locals }): Promise<Response> {
  try {
    // Ensure user is authenticated
    const authResult = ensureAuthenticated(locals);
    if (!authResult.success) return authResult.response;

    // Parse request body
    const body = await request.json();

    // Validate input data using Zod schema
    const validation = CreateCategoryCommandSchema.safeParse(body);
    if (!validation.success) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: validation.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create category service instance
    const categoryService = new CategoryService(locals.supabase);

    // Create the category
    const newCategory: CategoryDTO = await categoryService.createCategory(validation.data, authResult.user.id);

    // Return success response
    return createSuccessResponse(newCategory, 201);
  } catch (error) {
    // Handle specific business logic errors
    if (error instanceof Error) {
      if (error.message.includes("Parent category does not exist")) {
        return createErrorResponse("VALIDATION_ERROR", "Validation failed", 400, [
          {
            field: "parent_id",
            message: "Parent category does not exist or is not active",
          },
        ]);
      }

      if (error.message.includes("category with this name already exists")) {
        return createErrorResponse("VALIDATION_ERROR", "Validation failed", 400, [
          {
            field: "name",
            message: "A category with this name already exists in the same location",
          },
        ]);
      }

      if (error.message.includes("Maximum category depth")) {
        return createErrorResponse("HIERARCHY_ERROR", "Maximum category depth is 2 levels", 400);
      }

      if (error.message.includes("type must match parent")) {
        return createErrorResponse("TYPE_MISMATCH_ERROR", "Subcategory type must match parent category type", 400);
      }
    }

    // Handle unexpected errors
    // TODO: Replace with proper logging service in production
    // console.error("Unexpected error in POST /api/categories:", error);
    return createErrorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500);
  }
}

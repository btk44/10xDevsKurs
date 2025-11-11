import type { APIContext } from "astro";
import { CategoryService } from "../../../lib/services/CategoryService";
import { UpdateCategoryCommandSchema, IdParamSchema } from "../../../lib/validation/schemas";
import type { ApiErrorResponse, CategoryDTO, UpdateCategoryCommand, ValidationErrorDetail } from "../../../types";

export const prerender = false;

// Helper functions for common API operations
function ensureAuthenticated(locals: App.Locals) {
  if (!locals.user) {
    return {
      success: false,
      response: createErrorResponse("UNAUTHENTICATED", "Authentication required", 401),
    } as const;
  }
  return { success: true, user: locals.user } as const;
}

function createErrorResponse(
  code: string,
  message: string,
  status: number,
  details?: ValidationErrorDetail[] | Record<string, unknown>
): Response {
  const errorResponse: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function createSuccessResponse<T>(data: T, status = 200): Response {
  const response = { data };
  return new Response(JSON.stringify(response), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate", // Prevent caching for user-specific data
    },
  });
}

function validateCategoryId(params: APIContext["params"]) {
  const idValidation = IdParamSchema.safeParse(params.id);
  if (!idValidation.success) {
    return {
      success: false,
      response: createErrorResponse("INVALID_CATEGORY_ID", "Category ID must be a positive integer", 400, [
        {
          field: "id",
          message: "Category ID must be a positive integer",
        },
      ]),
    } as const;
  }
  return { success: true, categoryId: idValidation.data } as const;
}

/**
 * GET /api/categories/:id - Retrieve a single category
 * Retrieves detailed information for a specific category belonging to the authenticated user
 */
export async function GET({ params, locals }: APIContext): Promise<Response> {
  try {
    // Ensure user is authenticated
    const authResult = ensureAuthenticated(locals);
    if (!authResult.success) return authResult.response;

    // Validate path parameter (category ID)
    const idValidation = validateCategoryId(params);
    if (!idValidation.success) return idValidation.response;

    // Create category service instance
    const categoryService = new CategoryService(locals.supabase);

    // Retrieve the category
    const category: CategoryDTO | null = await categoryService.getCategoryById(
      idValidation.categoryId,
      authResult.user.id
    );

    // Handle category not found
    if (!category) {
      return createErrorResponse("CATEGORY_NOT_FOUND", `Category with ID ${idValidation.categoryId} not found`, 404);
    }

    // Return success response
    return createSuccessResponse(category);
  } catch (error) {
    // Handle specific service errors
    if (error instanceof Error) {
      // Database connection or Supabase errors
      if (error.message.includes("Failed to retrieve category") || error.message.includes("Database")) {
        return createErrorResponse("DATABASE_ERROR", "Unable to retrieve category at this time", 503, {
          message: "Database operation failed",
        });
      }

      // Authentication errors
      if (error.message.includes("JWT") || error.message.includes("auth")) {
        return createErrorResponse("AUTHENTICATION_ERROR", "Authentication failed", 401);
      }

      // Invalid user ID
      if (error.message.includes("Valid user ID is required")) {
        return createErrorResponse("INVALID_USER_ID", "Invalid user identification", 401);
      }
    }

    // Handle unexpected errors
    // TODO: Replace with proper logging service in production
    // console.error("Unexpected error in GET /api/categories/:id:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      "An unexpected error occurred",
      500,
      error instanceof Error ? { message: error.message } : undefined
    );
  }
}

/**
 * PATCH /api/categories/:id - Update an existing category
 * Updates category properties with business rule validation and hierarchy constraints
 */
export async function PATCH({ params, request, locals }: APIContext): Promise<Response> {
  try {
    // Ensure user is authenticated
    const authResult = ensureAuthenticated(locals);
    if (!authResult.success) return authResult.response;

    // Validate path parameter (category ID)
    const idValidation = validateCategoryId(params);
    if (!idValidation.success) return idValidation.response;

    // Parse and validate request body
    const body = await request.json();
    const validation = UpdateCategoryCommandSchema.safeParse(body);
    if (!validation.success) {
      // Create detailed validation error messages
      const details = validation.error.errors.map((err) => {
        const field = err.path.join(".");
        let message = err.message;

        // Provide more user-friendly error messages
        if (field === "category_type" && err.code === "invalid_enum_value") {
          message = "Category type must be either 'income' or 'expense'";
        } else if (field === "parent_id") {
          if (err.message.includes("Expected number")) {
            message = "Parent ID must be a valid number";
          } else if (err.message.includes("Parent ID must be >= 0")) {
            message = "Parent ID must be 0 or greater (0 for main categories)";
          }
        } else if (field === "name") {
          if (err.message.includes("cannot be empty")) {
            message = "Category name cannot be empty";
          } else if (err.message.includes("cannot exceed 100 characters")) {
            message = "Category name cannot exceed 100 characters";
          }
        } else if (field === "tag" && err.message.includes("cannot exceed 10 characters")) {
          message = "Tag cannot exceed 10 characters";
        }

        return {
          field,
          message,
        };
      });

      return createErrorResponse("VALIDATION_ERROR", "Invalid request data provided", 400, details);
    }

    // Create category service instance
    const categoryService = new CategoryService(locals.supabase);

    // Update the category
    const updatedCategory: CategoryDTO = await categoryService.updateCategory(
      idValidation.categoryId,
      validation.data as UpdateCategoryCommand,
      authResult.user.id
    );

    // Return success response
    return createSuccessResponse(updatedCategory);
  } catch (error) {
    // Handle specific business logic errors
    if (error instanceof Error) {
      // Category not found or access denied
      if (error.message.includes("Category not found") || error.message.includes("access denied")) {
        return createErrorResponse("CATEGORY_NOT_FOUND", "Category not found or access denied", 404);
      }

      // Parent category validation errors
      if (error.message.includes("Parent category does not exist")) {
        return createErrorResponse("VALIDATION_ERROR", "Validation failed", 400, [
          {
            field: "parent_id",
            message: "Parent category does not exist or is not active",
          },
        ]);
      }

      // Hierarchy depth violations
      if (error.message.includes("Maximum category depth")) {
        return createErrorResponse("INVALID_CATEGORY_HIERARCHY", "Maximum category depth is 2 levels", 400, [
          {
            field: "parent_id",
            message: "Parent category is already a subcategory",
          },
        ]);
      }

      // Category type mismatch
      if (error.message.includes("type must match parent")) {
        return createErrorResponse("TYPE_MISMATCH_ERROR", "Subcategory type must match parent category type", 400, [
          {
            field: "category_type",
            message: "Subcategory type must match parent category type",
          },
        ]);
      }

      // Self-referencing parent
      if (error.message.includes("cannot be its own parent")) {
        return createErrorResponse("VALIDATION_ERROR", "Validation failed", 400, [
          {
            field: "parent_id",
            message: "Category cannot be its own parent",
          },
        ]);
      }

      // Name uniqueness violations
      if (error.message.includes("category with this name already exists")) {
        return createErrorResponse("VALIDATION_ERROR", "Validation failed", 400, [
          {
            field: "name",
            message: "A category with this name already exists in the same location",
          },
        ]);
      }

      // Database connection or Supabase errors
      if (error.message.includes("Failed to update category") || error.message.includes("Database")) {
        return createErrorResponse("DATABASE_ERROR", "Unable to update category at this time", 503, {
          message: "Database operation failed",
        });
      }

      // Authentication errors
      if (error.message.includes("JWT") || error.message.includes("auth")) {
        return createErrorResponse("AUTHENTICATION_ERROR", "Authentication failed", 401);
      }

      // Invalid user ID
      if (error.message.includes("Valid user ID is required")) {
        return createErrorResponse("INVALID_USER_ID", "Invalid user identification", 401);
      }

      // Invalid category ID
      if (error.message.includes("Valid category ID is required")) {
        return createErrorResponse("INVALID_CATEGORY_ID", "Category ID must be a positive integer", 400);
      }
    }

    // Handle unexpected errors
    // TODO: Replace with proper logging service in production
    // console.error("Unexpected error in PATCH /api/categories/:id:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      "An unexpected error occurred",
      500,
      error instanceof Error ? { message: error.message } : undefined
    );
  }
}

/**
 * DELETE /api/categories/:id - Delete a category (soft delete)
 * Performs soft deletion by setting active flag to false after validating no active transactions exist
 */
export async function DELETE({ params, locals }: APIContext): Promise<Response> {
  try {
    // Ensure user is authenticated
    const authResult = ensureAuthenticated(locals);
    if (!authResult.success) return authResult.response;

    // Validate path parameter (category ID)
    const idValidation = validateCategoryId(params);
    if (!idValidation.success) return idValidation.response;

    // Create category service instance
    const categoryService = new CategoryService(locals.supabase);

    // Delete the category (soft delete)
    await categoryService.deleteCategory(idValidation.categoryId, authResult.user.id);

    // Return success response (204 No Content)
    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    // Handle specific business logic errors
    if (error instanceof Error) {
      // Category not found or access denied
      if (error.message.includes("Category not found") || error.message.includes("access denied")) {
        return createErrorResponse("CATEGORY_NOT_FOUND", "Category not found", 404);
      }

      // Category has active transactions (conflict)
      if (error.message.includes("Cannot delete category with active transactions")) {
        // Extract transaction count from error message
        const match = error.message.match(/(\d+) transaction\(s\) found/);
        const transactionCount = match ? parseInt(match[1], 10) : 0;

        return createErrorResponse("CATEGORY_IN_USE", "Cannot delete category with active transactions", 409, {
          transaction_count: transactionCount,
        });
      }

      // Database connection or Supabase errors
      if (
        error.message.includes("Failed to delete category") ||
        error.message.includes("Failed to check category usage") ||
        error.message.includes("Database")
      ) {
        return createErrorResponse("DATABASE_ERROR", "Unable to delete category at this time", 503, {
          message: "Database operation failed",
        });
      }

      // Authentication errors
      if (error.message.includes("JWT") || error.message.includes("auth")) {
        return createErrorResponse("AUTHENTICATION_ERROR", "Authentication failed", 401);
      }

      // Invalid user ID
      if (error.message.includes("Valid user ID is required")) {
        return createErrorResponse("INVALID_USER_ID", "Invalid user identification", 401);
      }

      // Invalid category ID
      if (error.message.includes("Valid category ID is required")) {
        return createErrorResponse("INVALID_CATEGORY_ID", "Category ID must be a positive integer", 400);
      }
    }

    // Handle unexpected errors
    // TODO: Replace with proper logging service in production
    // console.error("Unexpected error in DELETE /api/categories/:id:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      "An unexpected error occurred",
      500,
      error instanceof Error ? { message: error.message } : undefined
    );
  }
}

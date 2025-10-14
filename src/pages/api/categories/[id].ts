import type { APIContext } from "astro";
import { CategoryService } from "../../../lib/services/CategoryService";
import { UpdateCategoryCommandSchema, IdParamSchema } from "../../../lib/validation/schemas";
import type { ApiResponse, ApiErrorResponse, CategoryDTO, UpdateCategoryCommand } from "../../../types";

export const prerender = false;

/**
 * GET /api/categories/:id - Retrieve a single category
 * Retrieves detailed information for a specific category belonging to the authenticated user
 */
export async function GET({ params, locals }: APIContext): Promise<Response> {
  try {
    // Ensure user is authenticated
    if (!locals.user) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate path parameter (category ID)
    const idValidation = IdParamSchema.safeParse(params.id);
    if (!idValidation.success) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "INVALID_CATEGORY_ID",
          message: "Category ID must be a positive integer",
          details: [
            {
              field: "id",
              message: "Category ID must be a positive integer",
            },
          ],
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const categoryId = idValidation.data;

    // Create category service instance
    const categoryService = new CategoryService(locals.supabase);

    // Retrieve the category
    const category: CategoryDTO | null = await categoryService.getCategoryById(categoryId, locals.user.id);

    // Handle category not found
    if (!category) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "CATEGORY_NOT_FOUND",
          message: `Category with ID ${categoryId} not found`,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Return success response
    const successResponse: ApiResponse<CategoryDTO> = {
      data: category,
    };

    return new Response(JSON.stringify(successResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate", // Prevent caching for user-specific data
      },
    });
  } catch (error) {
    // Handle specific service errors
    if (error instanceof Error) {
      // Database connection or Supabase errors
      if (error.message.includes("Failed to retrieve category") || error.message.includes("Database")) {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "DATABASE_ERROR",
            message: "Unable to retrieve category at this time",
            details: { message: "Database operation failed" },
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Authentication errors
      if (error.message.includes("JWT") || error.message.includes("auth")) {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "AUTHENTICATION_ERROR",
            message: "Authentication failed",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Invalid user ID
      if (error.message.includes("Valid user ID is required")) {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "INVALID_USER_ID",
            message: "Invalid user identification",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Handle unexpected errors
    // TODO: Replace with proper logging service in production
    // console.error("Unexpected error in GET /api/categories/:id:", error);
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
 * PATCH /api/categories/:id - Update an existing category
 * Updates category properties with business rule validation and hierarchy constraints
 */
export async function PATCH({ params, request, locals }: APIContext): Promise<Response> {
  try {
    // Ensure user is authenticated
    if (!locals.user) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate path parameter (category ID)
    const idValidation = IdParamSchema.safeParse(params.id);
    if (!idValidation.success) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "INVALID_CATEGORY_ID",
          message: "Category ID must be a positive integer",
          details: [
            {
              field: "id",
              message: "Category ID must be a positive integer",
            },
          ],
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const categoryId = idValidation.data;

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

      const errorResponse: ApiErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data provided",
          details,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create category service instance
    const categoryService = new CategoryService(locals.supabase);

    // Update the category
    const updatedCategory: CategoryDTO = await categoryService.updateCategory(
      categoryId,
      validation.data as UpdateCategoryCommand,
      locals.user.id
    );

    // Return success response
    const successResponse: ApiResponse<CategoryDTO> = {
      data: updatedCategory,
    };

    return new Response(JSON.stringify(successResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate", // Prevent caching for user-specific data
      },
    });
  } catch (error) {
    // Handle specific business logic errors
    if (error instanceof Error) {
      // Category not found or access denied
      if (error.message.includes("Category not found") || error.message.includes("access denied")) {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "CATEGORY_NOT_FOUND",
            message: "Category not found or access denied",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Parent category validation errors
      if (error.message.includes("Parent category does not exist")) {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: [
              {
                field: "parent_id",
                message: "Parent category does not exist or is not active",
              },
            ],
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Hierarchy depth violations
      if (error.message.includes("Maximum category depth")) {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "INVALID_CATEGORY_HIERARCHY",
            message: "Maximum category depth is 2 levels",
            details: [
              {
                field: "parent_id",
                message: "Parent category is already a subcategory",
              },
            ],
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Category type mismatch
      if (error.message.includes("type must match parent")) {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "TYPE_MISMATCH_ERROR",
            message: "Subcategory type must match parent category type",
            details: [
              {
                field: "category_type",
                message: "Subcategory type must match parent category type",
              },
            ],
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Self-referencing parent
      if (error.message.includes("cannot be its own parent")) {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: [
              {
                field: "parent_id",
                message: "Category cannot be its own parent",
              },
            ],
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Name uniqueness violations
      if (error.message.includes("category with this name already exists")) {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: [
              {
                field: "name",
                message: "A category with this name already exists in the same location",
              },
            ],
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Database connection or Supabase errors
      if (error.message.includes("Failed to update category") || error.message.includes("Database")) {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "DATABASE_ERROR",
            message: "Unable to update category at this time",
            details: { message: "Database operation failed" },
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Authentication errors
      if (error.message.includes("JWT") || error.message.includes("auth")) {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "AUTHENTICATION_ERROR",
            message: "Authentication failed",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Invalid user ID
      if (error.message.includes("Valid user ID is required")) {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "INVALID_USER_ID",
            message: "Invalid user identification",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Invalid category ID
      if (error.message.includes("Valid category ID is required")) {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "INVALID_CATEGORY_ID",
            message: "Category ID must be a positive integer",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Handle unexpected errors
    // TODO: Replace with proper logging service in production
    // console.error("Unexpected error in PATCH /api/categories/:id:", error);
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
 * DELETE /api/categories/:id - Delete a category (soft delete)
 * Performs soft deletion by setting active flag to false after validating no active transactions exist
 */
export async function DELETE({ params, locals }: APIContext): Promise<Response> {
  try {
    // Ensure user is authenticated
    if (!locals.user) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate path parameter (category ID)
    const idValidation = IdParamSchema.safeParse(params.id);
    if (!idValidation.success) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "INVALID_CATEGORY_ID",
          message: "Category ID must be a positive integer",
          details: [
            {
              field: "id",
              message: "Category ID must be a positive integer",
            },
          ],
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const categoryId = idValidation.data;

    // Create category service instance
    const categoryService = new CategoryService(locals.supabase);

    // Delete the category (soft delete)
    await categoryService.deleteCategory(categoryId, locals.user.id);

    // Return success response (204 No Content)
    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    // Handle specific business logic errors
    if (error instanceof Error) {
      // Category not found or access denied
      if (error.message.includes("Category not found") || error.message.includes("access denied")) {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "CATEGORY_NOT_FOUND",
            message: "Category not found",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Category has active transactions (conflict)
      if (error.message.includes("Cannot delete category with active transactions")) {
        // Extract transaction count from error message
        const match = error.message.match(/(\d+) transaction\(s\) found/);
        const transactionCount = match ? parseInt(match[1], 10) : 0;

        const errorResponse: ApiErrorResponse = {
          error: {
            code: "CATEGORY_IN_USE",
            message: "Cannot delete category with active transactions",
            details: {
              transaction_count: transactionCount,
            },
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Database connection or Supabase errors
      if (
        error.message.includes("Failed to delete category") ||
        error.message.includes("Failed to check category usage") ||
        error.message.includes("Database")
      ) {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "DATABASE_ERROR",
            message: "Unable to delete category at this time",
            details: { message: "Database operation failed" },
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Authentication errors
      if (error.message.includes("JWT") || error.message.includes("auth")) {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "AUTHENTICATION_ERROR",
            message: "Authentication failed",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Invalid user ID
      if (error.message.includes("Valid user ID is required")) {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "INVALID_USER_ID",
            message: "Invalid user identification",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Invalid category ID
      if (error.message.includes("Valid category ID is required")) {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "INVALID_CATEGORY_ID",
            message: "Category ID must be a positive integer",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Handle unexpected errors
    // TODO: Replace with proper logging service in production
    // console.error("Unexpected error in DELETE /api/categories/:id:", error);
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

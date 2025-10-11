import type { APIContext } from "astro";
import { CategoryService } from "../../lib/services/CategoryService";
import { CreateCategoryCommandSchema, GetCategoriesQuerySchema } from "../../lib/validation/schemas";
import type {
  ApiResponse,
  ApiErrorResponse,
  ApiCollectionResponse,
  CategoryDTO,
  CreateCategoryCommand,
  GetCategoriesQuery,
} from "../../types";

// Default user ID for development (ignoring auth for now)
const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

export const prerender = false;

/**
 * GET /api/categories - Retrieve categories
 * Retrieves all categories belonging to the authenticated user with optional filtering
 */
export async function GET({ url, locals }: APIContext): Promise<Response> {
  try {
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

      const errorResponse: ApiErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters provided",
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

    // Retrieve categories with filtering
    const categories: CategoryDTO[] = await categoryService.getCategories(
      validation.data as GetCategoriesQuery,
      DEFAULT_USER_ID
    );

    // Return success response with proper handling of empty results
    const successResponse: ApiCollectionResponse<CategoryDTO> = {
      data: categories, // Will be empty array if no categories found
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
      // Handle validation errors from service layer
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

      // Handle database connection errors
      if (error.message.includes("Failed to retrieve categories")) {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "DATABASE_ERROR",
            message: "Unable to retrieve categories at this time",
            details: { message: "Database operation failed" },
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Handle Supabase-specific errors
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
export async function POST({ request, locals }: APIContext): Promise<Response> {
  try {
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
    const newCategory: CategoryDTO = await categoryService.createCategory(
      validation.data as CreateCategoryCommand,
      DEFAULT_USER_ID
    );

    // Return success response
    const successResponse: ApiResponse<CategoryDTO> = {
      data: newCategory,
    };

    return new Response(JSON.stringify(successResponse), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle specific business logic errors
    if (error instanceof Error) {
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

      if (error.message.includes("Maximum category depth")) {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "HIERARCHY_ERROR",
            message: "Maximum category depth is 2 levels",
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (error.message.includes("type must match parent")) {
        const errorResponse: ApiErrorResponse = {
          error: {
            code: "TYPE_MISMATCH_ERROR",
            message: "Subcategory type must match parent category type",
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
    // console.error("Unexpected error in POST /api/categories:", error);
    const errorResponse: ApiErrorResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

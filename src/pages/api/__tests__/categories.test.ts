import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../categories";
import {
  createMockAuthenticatedCategoriesContext,
  createMockUnauthenticatedCategoriesContext,
  createMockCategoriesContextWithQuery,
  createMockJSONRequest,
  parseResponse,
} from "../../../../tests/mocks/api";
import { createMockSupabaseClient } from "../../../../tests/mocks/supabase";

// Mock the CategoryService
vi.mock("../../../lib/services/CategoryService", () => ({
  CategoryService: vi.fn(),
}));

// Mock the validation schemas
vi.mock("../../../lib/validation/schemas", () => ({
  GetCategoriesQuerySchema: {
    safeParse: vi.fn(),
  },
  CreateCategoryCommandSchema: {
    safeParse: vi.fn(),
  },
}));

import { CategoryService } from "../../../lib/services/CategoryService";
import { GetCategoriesQuerySchema, CreateCategoryCommandSchema } from "../../../lib/validation/schemas";

describe("GET /api/categories", () => {
  let mockCategoryService: any;
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    mockCategoryService = {
      getCategories: vi.fn(),
      createCategory: vi.fn(),
    };
    (CategoryService as any).mockImplementation(() => mockCategoryService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Request Validation & Input Handling", () => {
    it("validates query parameters successfully", async () => {
      const queryParams = {
        type: "expense",
        parent_id: "5",
        include_inactive: "false",
      };

      const expectedParsedQuery = {
        type: "expense",
        parent_id: 5,
        include_inactive: false,
      };

      const mockCategories = [{ id: 1, name: "Groceries", type: "expense", is_active: true }];

      (GetCategoriesQuerySchema.safeParse as any).mockReturnValue({
        success: true,
        data: expectedParsedQuery,
      });

      mockCategoryService.getCategories.mockResolvedValue(mockCategories);

      const context = createMockCategoriesContextWithQuery(queryParams);

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(GetCategoriesQuerySchema.safeParse).toHaveBeenCalledWith(queryParams);
      expect(mockCategoryService.getCategories).toHaveBeenCalledWith(expectedParsedQuery, "test-user-id");
      expect(response.status).toBe(200);
      expect(result.body).toMatchInlineSnapshot(`
        {
          "data": [
            {
              "id": 1,
              "is_active": true,
              "name": "Groceries",
              "type": "expense",
            },
          ],
        }
      `);
    });

    it("handles undefined query parameters gracefully", async () => {
      const expectedParsedQuery = {};

      const mockCategories = [
        { id: 1, name: "Category 1", type: "income", is_active: true },
        { id: 2, name: "Category 2", type: "expense", is_active: true },
      ];

      (GetCategoriesQuerySchema.safeParse as any).mockReturnValue({
        success: true,
        data: expectedParsedQuery,
      });

      mockCategoryService.getCategories.mockResolvedValue(mockCategories);

      const context = createMockAuthenticatedCategoriesContext();

      const response = await GET(context);

      expect(GetCategoriesQuerySchema.safeParse).toHaveBeenCalledWith({});
      expect(mockCategoryService.getCategories).toHaveBeenCalledWith(expectedParsedQuery, "test-user-id");
    });

    it("validates category type enum values", async () => {
      (GetCategoriesQuerySchema.safeParse as any).mockReturnValue({
        success: false,
        error: {
          errors: [
            {
              path: ["type"],
              code: "invalid_enum_value",
              message: "Invalid enum value",
            },
          ],
        },
      });

      const context = createMockCategoriesContextWithQuery({
        type: "invalid",
      });

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(result.body.error.code).toBe("VALIDATION_ERROR");
      expect(result.body.error.details[0].message).toBe("Category type must be either 'income' or 'expense'");
    });

    it("validates parent_id as number", async () => {
      (GetCategoriesQuerySchema.safeParse as any).mockReturnValue({
        success: false,
        error: {
          errors: [
            {
              path: ["parent_id"],
              message: "Expected number, received string",
            },
          ],
        },
      });

      const context = createMockCategoriesContextWithQuery({
        parent_id: "not-a-number",
      });

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(result.body.error.details[0].message).toBe("Parent ID must be a valid number");
    });

    it("validates parent_id minimum value", async () => {
      (GetCategoriesQuerySchema.safeParse as any).mockReturnValue({
        success: false,
        error: {
          errors: [
            {
              path: ["parent_id"],
              message: "Parent ID must be >= 0",
            },
          ],
        },
      });

      const context = createMockCategoriesContextWithQuery({
        parent_id: "-1",
      });

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(result.body.error.details[0].message).toBe("Parent ID must be 0 or greater (0 for main categories)");
    });

    it("validates include_inactive boolean values", async () => {
      (GetCategoriesQuerySchema.safeParse as any).mockReturnValue({
        success: false,
        error: {
          errors: [
            {
              path: ["include_inactive"],
              message: "Invalid value",
            },
          ],
        },
      });

      const context = createMockCategoriesContextWithQuery({
        include_inactive: "maybe",
      });

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(result.body.error.details[0].message).toBe("Include inactive must be 'true' or 'false'");
    });
  });

  describe("Authentication & Authorization Logic", () => {
    it("returns 401 when user is not authenticated", async () => {
      const context = createMockUnauthenticatedCategoriesContext();

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(401);
      expect(result.body).toMatchInlineSnapshot(`
        {
          "error": {
            "code": "UNAUTHENTICATED",
            "message": "Authentication required",
          },
        }
      `);
    });

    it("passes authenticated user context to service layer", async () => {
      const userId = "authenticated-user-789";

      (GetCategoriesQuerySchema.safeParse as any).mockReturnValue({
        success: true,
        data: {},
      });

      mockCategoryService.getCategories.mockResolvedValue([]);

      const context = createMockAuthenticatedCategoriesContext(userId);

      await GET(context);

      expect(mockCategoryService.getCategories).toHaveBeenCalledWith({}, userId);
    });
  });

  describe("Error Handling & Response Formatting", () => {
    it("handles database connection errors", async () => {
      (GetCategoriesQuerySchema.safeParse as any).mockReturnValue({
        success: true,
        data: {},
      });

      mockCategoryService.getCategories.mockRejectedValue(new Error("Failed to retrieve categories"));

      const context = createMockAuthenticatedCategoriesContext();

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(503);
      expect(result.body.error.code).toBe("DATABASE_ERROR");
      expect(result.body.error.message).toBe("Unable to retrieve categories at this time");
    });

    it("handles authentication/JWT errors", async () => {
      (GetCategoriesQuerySchema.safeParse as any).mockReturnValue({
        success: true,
        data: {},
      });

      mockCategoryService.getCategories.mockRejectedValue(new Error("JWT token expired"));

      const context = createMockAuthenticatedCategoriesContext();

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(401);
      expect(result.body.error.code).toBe("AUTHENTICATION_ERROR");
      expect(result.body.error.message).toBe("Authentication failed");
    });

    it("handles user ID validation errors", async () => {
      (GetCategoriesQuerySchema.safeParse as any).mockReturnValue({
        success: true,
        data: {},
      });

      mockCategoryService.getCategories.mockRejectedValue(new Error("Valid user ID is required"));

      const context = createMockAuthenticatedCategoriesContext();

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(401);
      expect(result.body.error.code).toBe("INVALID_USER_ID");
      expect(result.body.error.message).toBe("Invalid user identification");
    });

    it("handles unexpected errors with detailed information", async () => {
      (GetCategoriesQuerySchema.safeParse as any).mockReturnValue({
        success: true,
        data: {},
      });

      mockCategoryService.getCategories.mockRejectedValue(new Error("Unexpected database error"));

      const context = createMockAuthenticatedCategoriesContext();

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(500);
      expect(result.body.error.code).toBe("INTERNAL_ERROR");
      expect(result.body.error.message).toBe("An unexpected error occurred");
      expect(result.body.error.details.message).toBe("Unexpected database error");
    });

    it("includes proper cache control headers", async () => {
      (GetCategoriesQuerySchema.safeParse as any).mockReturnValue({
        success: true,
        data: {},
      });

      mockCategoryService.getCategories.mockResolvedValue([]);

      const context = createMockAuthenticatedCategoriesContext();

      const response = await GET(context);

      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(response.headers.get("Cache-Control")).toBe("no-cache, no-store, must-revalidate");
    });
  });

  describe("Business Logic Integration", () => {
    it("successfully retrieves categories with complex filtering", async () => {
      const queryParams = {
        type: "expense",
        parent_id: "10",
        include_inactive: "true",
      };

      const expectedParsedQuery = {
        type: "expense",
        parent_id: 10,
        include_inactive: true,
      };

      const mockCategories = [
        {
          id: 100,
          name: "Food Subcategory",
          type: "expense",
          parent_id: 10,
          is_active: true,
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: 101,
          name: "Inactive Subcategory",
          type: "expense",
          parent_id: 10,
          is_active: false,
          created_at: "2024-01-02T00:00:00Z",
        },
      ];

      (GetCategoriesQuerySchema.safeParse as any).mockReturnValue({
        success: true,
        data: expectedParsedQuery,
      });

      mockCategoryService.getCategories.mockResolvedValue(mockCategories);

      const context = createMockCategoriesContextWithQuery(queryParams);

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(mockCategoryService.getCategories).toHaveBeenCalledWith(expectedParsedQuery, "test-user-id");
      expect(response.status).toBe(200);
      expect(result.body.data).toEqual(mockCategories);
    });

    it("handles empty categories list correctly", async () => {
      (GetCategoriesQuerySchema.safeParse as any).mockReturnValue({
        success: true,
        data: {},
      });

      mockCategoryService.getCategories.mockResolvedValue([]);

      const context = createMockAuthenticatedCategoriesContext();

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(result.body.data).toEqual([]);
    });

    it("initializes CategoryService with correct supabase client", async () => {
      (GetCategoriesQuerySchema.safeParse as any).mockReturnValue({
        success: true,
        data: {},
      });

      mockCategoryService.getCategories.mockResolvedValue([]);

      const context = createMockAuthenticatedCategoriesContext();

      await GET(context);

      expect(CategoryService).toHaveBeenCalledWith(context.locals.supabase);
    });
  });
});

describe("POST /api/categories", () => {
  let mockCategoryService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCategoryService = {
      getCategories: vi.fn(),
      createCategory: vi.fn(),
    };
    (CategoryService as any).mockImplementation(() => mockCategoryService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Request Validation & Input Handling", () => {
    it("validates category creation command successfully", async () => {
      const createCommand = {
        name: "New Category",
        type: "expense",
        parent_id: 5,
      };

      const createdCategory = {
        id: 123,
        ...createCommand,
        is_active: true,
        created_at: "2024-01-15T10:00:00Z",
      };

      (CreateCategoryCommandSchema.safeParse as any).mockReturnValue({
        success: true,
        data: createCommand,
      });

      mockCategoryService.createCategory.mockResolvedValue(createdCategory);

      const context = createMockAuthenticatedCategoriesContext();
      context.request = createMockJSONRequest(createCommand);

      const response = await POST(context);
      const result = await parseResponse(response);

      expect(CreateCategoryCommandSchema.safeParse).toHaveBeenCalledWith(createCommand);
      expect(mockCategoryService.createCategory).toHaveBeenCalledWith(createCommand, "test-user-id");
      expect(response.status).toBe(201);
      expect(result.body).toMatchInlineSnapshot(`
        {
          "data": {
            "created_at": "2024-01-15T10:00:00Z",
            "id": 123,
            "is_active": true,
            "name": "New Category",
            "parent_id": 5,
            "type": "expense",
          },
        }
      `);
    });

    it("validates required fields in category creation", async () => {
      const invalidCommand = { name: "Test" }; // Missing type

      (CreateCategoryCommandSchema.safeParse as any).mockReturnValue({
        success: false,
        error: {
          errors: [
            {
              path: ["type"],
              message: "Type is required",
            },
          ],
        },
      });

      const context = createMockAuthenticatedCategoriesContext();
      context.request = createMockJSONRequest(invalidCommand);

      const response = await POST(context);
      const result = await parseResponse(response);

      expect(CreateCategoryCommandSchema.safeParse).toHaveBeenCalledWith(invalidCommand);
      expect(response.status).toBe(400);
      expect(result.body.error.code).toBe("VALIDATION_ERROR");
      expect(result.body.error.message).toBe("Validation failed");
    });
  });

  describe("Authentication & Authorization Logic", () => {
    it("returns 401 when user is not authenticated for POST", async () => {
      const context = createMockUnauthenticatedCategoriesContext();

      const response = await POST(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(401);
      expect(result.body).toMatchInlineSnapshot(`
        {
          "error": {
            "code": "UNAUTHENTICATED",
            "message": "Authentication required",
          },
        }
      `);
    });

    it("passes authenticated user context to createCategory method", async () => {
      const userId = "authenticated-user-999";
      const createCommand = { name: "Test Category", type: "income" };

      (CreateCategoryCommandSchema.safeParse as any).mockReturnValue({
        success: true,
        data: createCommand,
      });

      mockCategoryService.createCategory.mockResolvedValue({ id: 1, ...createCommand });

      const context = createMockAuthenticatedCategoriesContext(userId);
      context.request = createMockJSONRequest(createCommand);

      await POST(context);

      expect(mockCategoryService.createCategory).toHaveBeenCalledWith(createCommand, userId);
    });
  });

  describe("Error Handling & Response Formatting", () => {
    it("handles parent category not found error", async () => {
      const createCommand = { name: "Subcategory", type: "expense", parent_id: 999 };

      (CreateCategoryCommandSchema.safeParse as any).mockReturnValue({
        success: true,
        data: createCommand,
      });

      mockCategoryService.createCategory.mockRejectedValue(new Error("Parent category does not exist"));

      const context = createMockAuthenticatedCategoriesContext();
      context.request = createMockJSONRequest(createCommand);

      const response = await POST(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(result.body.error.code).toBe("VALIDATION_ERROR");
      expect(result.body.error.message).toBe("Validation failed");
      expect(result.body.error.details[0].message).toBe("Parent category does not exist or is not active");
    });

    it("handles duplicate category name error", async () => {
      const createCommand = { name: "Existing Category", type: "expense" };

      (CreateCategoryCommandSchema.safeParse as any).mockReturnValue({
        success: true,
        data: createCommand,
      });

      mockCategoryService.createCategory.mockRejectedValue(new Error("category with this name already exists"));

      const context = createMockAuthenticatedCategoriesContext();
      context.request = createMockJSONRequest(createCommand);

      const response = await POST(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(result.body.error.code).toBe("VALIDATION_ERROR");
      expect(result.body.error.details[0].message).toBe(
        "A category with this name already exists in the same location"
      );
    });

    it("handles maximum hierarchy depth error", async () => {
      const createCommand = { name: "Deep Category", type: "expense", parent_id: 1 };

      (CreateCategoryCommandSchema.safeParse as any).mockReturnValue({
        success: true,
        data: createCommand,
      });

      mockCategoryService.createCategory.mockRejectedValue(new Error("Maximum category depth"));

      const context = createMockAuthenticatedCategoriesContext();
      context.request = createMockJSONRequest(createCommand);

      const response = await POST(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(result.body.error.code).toBe("HIERARCHY_ERROR");
      expect(result.body.error.message).toBe("Maximum category depth is 2 levels");
    });

    it("handles type mismatch with parent error", async () => {
      const createCommand = { name: "Wrong Type", type: "income", parent_id: 1 };

      (CreateCategoryCommandSchema.safeParse as any).mockReturnValue({
        success: true,
        data: createCommand,
      });

      mockCategoryService.createCategory.mockRejectedValue(new Error("type must match parent"));

      const context = createMockAuthenticatedCategoriesContext();
      context.request = createMockJSONRequest(createCommand);

      const response = await POST(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(result.body.error.code).toBe("TYPE_MISMATCH_ERROR");
      expect(result.body.error.message).toBe("Subcategory type must match parent category type");
    });

    it("handles unexpected errors with generic response", async () => {
      const createCommand = { name: "Test", type: "expense" };

      (CreateCategoryCommandSchema.safeParse as any).mockReturnValue({
        success: true,
        data: createCommand,
      });

      mockCategoryService.createCategory.mockRejectedValue(new Error("Unexpected database error"));

      const context = createMockAuthenticatedCategoriesContext();
      context.request = createMockJSONRequest(createCommand);

      const response = await POST(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(500);
      expect(result.body.error.code).toBe("INTERNAL_ERROR");
      expect(result.body.error.message).toBe("An unexpected error occurred");
    });

    it("returns proper status and headers for successful creation", async () => {
      const createCommand = { name: "New Category", type: "income" };
      const createdCategory = { id: 1, name: "New Category", type: "income" };

      (CreateCategoryCommandSchema.safeParse as any).mockReturnValue({
        success: true,
        data: createCommand,
      });

      mockCategoryService.createCategory.mockResolvedValue(createdCategory);

      const context = createMockAuthenticatedCategoriesContext();
      context.request = createMockJSONRequest(createCommand);

      const response = await POST(context);

      expect(response.status).toBe(201);
      expect(response.headers.get("Content-Type")).toBe("application/json");
    });
  });

  describe("Business Logic Integration", () => {
    it("successfully creates main category", async () => {
      const createCommand = {
        name: "Main Income Category",
        type: "income",
        // No parent_id for main category
      };

      const createdCategory = {
        id: 456,
        name: "Main Income Category",
        type: "income",
        parent_id: null,
        is_active: true,
        created_at: "2024-01-20T15:30:00Z",
      };

      (CreateCategoryCommandSchema.safeParse as any).mockReturnValue({
        success: true,
        data: createCommand,
      });

      mockCategoryService.createCategory.mockResolvedValue(createdCategory);

      const context = createMockAuthenticatedCategoriesContext();
      context.request = createMockJSONRequest(createCommand);

      const response = await POST(context);
      const result = await parseResponse(response);

      expect(mockCategoryService.createCategory).toHaveBeenCalledWith(createCommand, "test-user-id");
      expect(response.status).toBe(201);
      expect(result.body.data).toEqual(createdCategory);
    });

    it("successfully creates subcategory", async () => {
      const createCommand = {
        name: "Subcategory",
        type: "expense",
        parent_id: 10,
      };

      const createdCategory = {
        id: 789,
        name: "Subcategory",
        type: "expense",
        parent_id: 10,
        is_active: true,
        created_at: "2024-01-21T10:15:00Z",
      };

      (CreateCategoryCommandSchema.safeParse as any).mockReturnValue({
        success: true,
        data: createCommand,
      });

      mockCategoryService.createCategory.mockResolvedValue(createdCategory);

      const context = createMockAuthenticatedCategoriesContext();
      context.request = createMockJSONRequest(createCommand);

      const response = await POST(context);
      const result = await parseResponse(response);

      expect(mockCategoryService.createCategory).toHaveBeenCalledWith(createCommand, "test-user-id");
      expect(response.status).toBe(201);
      expect(result.body.data).toEqual(createdCategory);
    });

    it("initializes CategoryService with correct supabase client for POST", async () => {
      const createCommand = { name: "Test", type: "expense" };

      (CreateCategoryCommandSchema.safeParse as any).mockReturnValue({
        success: true,
        data: createCommand,
      });

      mockCategoryService.createCategory.mockResolvedValue({ id: 1, ...createCommand });

      const context = createMockAuthenticatedCategoriesContext();
      context.request = createMockJSONRequest(createCommand);

      await POST(context);

      expect(CategoryService).toHaveBeenCalledWith(context.locals.supabase);
    });
  });
});

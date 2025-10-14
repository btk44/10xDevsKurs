import { describe, it, expect, vi, beforeEach } from "vitest";
import { CategoryService } from "../CategoryService";
import { createMockSupabaseClient } from "../../../../tests/mocks/supabase";
import type { CreateCategoryCommand, UpdateCategoryCommand, CategoryDTO } from "../../../types";

describe("CategoryService", () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let categoryService: CategoryService;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    categoryService = new CategoryService(mockSupabase as any);
  });

  describe("validateInputs", () => {
    it("should throw error for invalid userId", () => {
      expect(() => categoryService["validateInputs"]("", "test")).toThrow("Valid user ID is required");
      expect(() => categoryService["validateInputs"](null as any, "test")).toThrow("Valid user ID is required");
      expect(() => categoryService["validateInputs"](undefined as any, "test")).toThrow("Valid user ID is required");
    });

    it("should throw error for invalid category name", () => {
      expect(() => categoryService["validateInputs"]("user123", "")).toThrow("Valid category name is required");
      expect(() => categoryService["validateInputs"]("user123", "   ")).toThrow("Valid category name is required");
      expect(() => categoryService["validateInputs"]("user123", null as any)).toThrow(
        "Valid category name is required"
      );
    });

    it("should throw error for category name exceeding 100 characters", () => {
      const longName = "a".repeat(101);
      expect(() => categoryService["validateInputs"]("user123", longName)).toThrow(
        "Category name cannot exceed 100 characters"
      );
    });

    it("should pass validation for valid inputs", () => {
      expect(() => categoryService["validateInputs"]("user123", "Valid Name")).not.toThrow();
      expect(() => categoryService["validateInputs"]("user123")).not.toThrow();
    });
  });

  describe("mapToCategoryDTO", () => {
    it("should map database result to CategoryDTO", () => {
      const dbResult = {
        id: 1,
        user_id: "user123",
        name: "Test Category",
        category_type: "expense" as const,
        parent_id: 0,
        tag: "test",
        active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const result = categoryService["mapToCategoryDTO"](dbResult);

      expect(result).toEqual({
        id: 1,
        user_id: "user123",
        name: "Test Category",
        category_type: "expense",
        parent_id: 0,
        tag: "test",
        active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      });
    });

    it("should handle null tag", () => {
      const dbResult = {
        id: 1,
        user_id: "user123",
        name: "Test Category",
        category_type: "income" as const,
        parent_id: 5,
        tag: null,
        active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const result = categoryService["mapToCategoryDTO"](dbResult);

      expect(result.tag).toBeNull();
    });

    it("should throw error for invalid database result", () => {
      expect(() => categoryService["mapToCategoryDTO"](null as any)).toThrow(
        "Invalid database result for category mapping"
      );
      expect(() => categoryService["mapToCategoryDTO"](undefined as any)).toThrow(
        "Invalid database result for category mapping"
      );
    });
  });

  describe("validateParentCategory", () => {
    it("should validate parent category successfully", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { category_type: "expense", parent_id: 0 },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      await expect(categoryService["validateParentCategory"](1, "user123", "expense")).resolves.not.toThrow();
    });

    it("should throw error when parent category not found", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "No rows found" },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      await expect(categoryService["validateParentCategory"](1, "user123", "expense")).rejects.toThrow(
        "Parent category does not exist or is not active"
      );
    });

    it("should throw error when parent is already a subcategory", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { category_type: "expense", parent_id: 5 },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      await expect(categoryService["validateParentCategory"](1, "user123", "expense")).rejects.toThrow(
        "Maximum category depth is 2 levels"
      );
    });

    it("should throw error when category types don't match", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { category_type: "income", parent_id: 0 },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      await expect(categoryService["validateParentCategory"](1, "user123", "expense")).rejects.toThrow(
        "Subcategory type must match parent category type"
      );
    });

    it("should throw error on database failure", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "500", message: "Database error" },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      await expect(categoryService["validateParentCategory"](1, "user123", "expense")).rejects.toThrow(
        "Failed to validate parent category: Database error"
      );
    });
  });

  describe("validateCategoryNameUniqueness", () => {
    it("should validate name uniqueness successfully when no duplicates found", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        neq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      await expect(
        categoryService["validateCategoryNameUniqueness"]("Test Category", 0, "user123")
      ).resolves.not.toThrow();
    });

    it("should throw error when duplicate category name found", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [{ id: 2 }],
          error: null,
        }),
        neq: vi.fn().mockResolvedValue({
          data: [{ id: 2 }],
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      await expect(categoryService["validateCategoryNameUniqueness"]("Test Category", 0, "user123")).rejects.toThrow(
        "A category with this name already exists in the same location"
      );
    });

    it("should resolve when no duplicate category name found", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        neq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      await expect(
        categoryService["validateCategoryNameUniqueness"]("Test Category", 0, "user123")
      ).resolves.toBeUndefined();
    });

    it("should exclude current category when updating", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        neq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      await expect(
        categoryService["validateCategoryNameUniqueness"]("Test Category", 0, "user123", 1)
      ).resolves.not.toThrow();

      expect(mockQueryBuilder.neq).toHaveBeenCalledWith("id", 1);
    });

    it("should throw error on database failure", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "500", message: "Database error" },
        }),
        neq: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "500", message: "Database error" },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      await expect(categoryService["validateCategoryNameUniqueness"]("Test Category", 0, "user123")).rejects.toThrow(
        "Failed to check category name uniqueness: Database error"
      );
    });
  });

  describe("createCategory", () => {
    const validCommand: CreateCategoryCommand = {
      name: "Test Category",
      category_type: "expense",
      parent_id: 0,
      tag: "test",
    };

    it("should create category successfully", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };

      // Mock validation calls
      vi.spyOn(categoryService as any, "validateInputs").mockImplementation(() => {});
      vi.spyOn(categoryService as any, "validateParentCategory").mockResolvedValue(undefined);
      vi.spyOn(categoryService as any, "validateCategoryNameUniqueness").mockResolvedValue(undefined);

      // Mock insert operation
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: {
          id: 1,
          user_id: "user123",
          name: "Test Category",
          category_type: "expense",
          parent_id: 0,
          tag: "test",
          active: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        error: null,
      });

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      const result = await categoryService.createCategory(validCommand, "user123");

      expect(result).toEqual({
        id: 1,
        user_id: "user123",
        name: "Test Category",
        category_type: "expense",
        parent_id: 0,
        tag: "test",
        active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      });
    });

    it("should validate parent category when parent_id is provided", async () => {
      const commandWithParent = { ...validCommand, parent_id: 5 };

      vi.spyOn(categoryService as any, "validateInputs").mockImplementation(() => {});
      vi.spyOn(categoryService as any, "validateParentCategory").mockResolvedValue(undefined);
      vi.spyOn(categoryService as any, "validateCategoryNameUniqueness").mockResolvedValue(undefined);

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            user_id: "user123",
            name: "Test Category",
            category_type: "expense",
            parent_id: 5,
            tag: "test",
            active: true,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      await categoryService.createCategory(commandWithParent, "user123");

      expect(categoryService["validateParentCategory"]).toHaveBeenCalledWith(5, "user123", "expense");
    });

    it("should handle unique constraint violations", async () => {
      vi.spyOn(categoryService as any, "validateInputs").mockImplementation(() => {});
      vi.spyOn(categoryService as any, "validateParentCategory").mockResolvedValue(undefined);
      vi.spyOn(categoryService as any, "validateCategoryNameUniqueness").mockResolvedValue(undefined);

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "23505", message: "Duplicate key value" },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      await expect(categoryService.createCategory(validCommand, "user123")).rejects.toThrow(
        "A category with this name already exists in the same location"
      );
    });

    it("should handle foreign key constraint violations", async () => {
      vi.spyOn(categoryService as any, "validateInputs").mockImplementation(() => {});
      vi.spyOn(categoryService as any, "validateParentCategory").mockResolvedValue(undefined);
      vi.spyOn(categoryService as any, "validateCategoryNameUniqueness").mockResolvedValue(undefined);

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "23503", message: "Foreign key violation" },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      await expect(categoryService.createCategory(validCommand, "user123")).rejects.toThrow(
        "Referenced parent category is invalid"
      );
    });
  });

  describe("getCategoryById", () => {
    it("should return category when found", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            user_id: "user123",
            name: "Test Category",
            category_type: "expense",
            parent_id: 0,
            tag: null,
            active: true,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      const result = await categoryService.getCategoryById(1, "user123");

      expect(result).toEqual({
        id: 1,
        user_id: "user123",
        name: "Test Category",
        category_type: "expense",
        parent_id: 0,
        tag: null,
        active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      });
    });

    it("should return null when category not found", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "No rows found" },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      const result = await categoryService.getCategoryById(1, "user123");

      expect(result).toBeNull();
    });

    it("should throw error on database failure", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "500", message: "Database error" },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      await expect(categoryService.getCategoryById(1, "user123")).rejects.toThrow(
        "Failed to retrieve category: Database error"
      );
    });
  });

  describe("updateCategory", () => {
    const validUpdateCommand: UpdateCategoryCommand = {
      name: "Updated Category",
      tag: "updated",
    };

    it("should update category successfully", async () => {
      // Mock validation
      vi.spyOn(categoryService as any, "validateInputs").mockImplementation(() => {});

      // Mock getCategoryById
      vi.spyOn(categoryService, "getCategoryById").mockResolvedValue({
        id: 1,
        user_id: "user123",
        name: "Old Name",
        category_type: "expense",
        parent_id: 0,
        tag: "old",
        active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      } as CategoryDTO);

      // Mock uniqueness validation
      vi.spyOn(categoryService as any, "validateCategoryNameUniqueness").mockResolvedValue(undefined);

      // Mock update operation
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            user_id: "user123",
            name: "Updated Category",
            category_type: "expense",
            parent_id: 0,
            tag: "updated",
            active: true,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-02T00:00:00Z",
          },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      const result = await categoryService.updateCategory(1, validUpdateCommand, "user123");

      expect(result).toEqual({
        id: 1,
        user_id: "user123",
        name: "Updated Category",
        category_type: "expense",
        parent_id: 0,
        tag: "updated",
        active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      });
    });

    it("should prevent self-referencing parent", async () => {
      vi.spyOn(categoryService as any, "validateInputs").mockImplementation(() => {});
      vi.spyOn(categoryService, "getCategoryById").mockResolvedValue({
        id: 1,
        user_id: "user123",
        name: "Test Category",
        category_type: "expense",
        parent_id: 0,
        tag: null,
        active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      } as CategoryDTO);

      await expect(categoryService.updateCategory(1, { parent_id: 1 }, "user123")).rejects.toThrow(
        "Category cannot be its own parent"
      );
    });

    it("should validate parent category when parent_id changes", async () => {
      vi.spyOn(categoryService as any, "validateInputs").mockImplementation(() => {});
      vi.spyOn(categoryService, "getCategoryById").mockResolvedValue({
        id: 1,
        user_id: "user123",
        name: "Test Category",
        category_type: "expense",
        parent_id: 0,
        tag: null,
        active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      } as CategoryDTO);

      vi.spyOn(categoryService as any, "validateParentCategory").mockResolvedValue(undefined);
      vi.spyOn(categoryService as any, "validateCategoryNameUniqueness").mockResolvedValue(undefined);

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            user_id: "user123",
            name: "Test Category",
            category_type: "expense",
            parent_id: 5,
            tag: null,
            active: true,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-02T00:00:00Z",
          },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      await categoryService.updateCategory(1, { parent_id: 5 }, "user123");

      expect(categoryService["validateParentCategory"]).toHaveBeenCalledWith(5, "user123", "expense");
    });

    it("should throw error when category not found", async () => {
      vi.spyOn(categoryService as any, "validateInputs").mockImplementation(() => {});
      vi.spyOn(categoryService, "getCategoryById").mockResolvedValue(null);

      await expect(categoryService.updateCategory(1, validUpdateCommand, "user123")).rejects.toThrow(
        "Category not found or access denied"
      );
    });
  });

  describe("deleteCategory", () => {
    it("should delete category successfully when no active transactions", async () => {
      vi.spyOn(categoryService as any, "validateInputs").mockImplementation(() => {});

      vi.spyOn(categoryService, "getCategoryById").mockResolvedValue({
        id: 1,
        user_id: "user123",
        name: "Test Category",
        category_type: "expense",
        parent_id: 0,
        tag: null,
        active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      } as CategoryDTO);

      // Mock transaction count check
      const transactionQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        head: vi.fn().mockResolvedValue({ count: 0, error: null }),
      };

      // Mock delete operation
      const categoryQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "transactions") {
          return transactionQueryBuilder as any;
        }
        return categoryQueryBuilder as any;
      });

      await expect(categoryService.deleteCategory(1, "user123")).resolves.not.toThrow();
    });

    it("should prevent deletion when active transactions exist", async () => {
      vi.spyOn(categoryService as any, "validateInputs").mockImplementation(() => {});

      vi.spyOn(categoryService, "getCategoryById").mockResolvedValue({
        id: 1,
        user_id: "user123",
        name: "Test Category",
        category_type: "expense",
        parent_id: 0,
        tag: null,
        active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      } as CategoryDTO);

      // Mock transaction count check with transactions
      const transactionQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((resolve) => {
          resolve({ count: 3, error: null });
        }),
      };

      // Mock category operations
      const categoryQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            user_id: "user123",
            name: "Test Category",
            category_type: "expense",
            parent_id: 0,
            tag: null,
            active: true,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
          error: null,
        }),
        update: vi.fn().mockReturnThis(),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "transactions") {
          return transactionQueryBuilder as any;
        }
        if (table === "categories") {
          return categoryQueryBuilder as any;
        }
        return {} as any;
      });

      await expect(categoryService.deleteCategory(1, "user123")).rejects.toThrow(
        "Cannot delete category with active transactions: 3 transaction(s) found"
      );
    });

    it("should throw error when category not found", async () => {
      vi.spyOn(categoryService as any, "validateInputs").mockImplementation(() => {});
      vi.spyOn(categoryService, "getCategoryById").mockResolvedValue(null);

      await expect(categoryService.deleteCategory(1, "user123")).rejects.toThrow("Category not found or access denied");
    });
  });

  describe("getCategories", () => {
    it("should retrieve categories with default filtering", async () => {
      vi.spyOn(categoryService as any, "validateInputs").mockImplementation(() => {});

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((resolve) => {
          resolve({
            data: [
              {
                id: 1,
                user_id: "user123",
                name: "Category 1",
                category_type: "expense",
                parent_id: 0,
                tag: null,
                active: true,
                created_at: "2024-01-01T00:00:00Z",
                updated_at: "2024-01-01T00:00:00Z",
              },
            ],
            error: null,
          });
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      const result = await categoryService.getCategories({}, "user123");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Category 1");
    });

    it("should apply category type filter", async () => {
      vi.spyOn(categoryService as any, "validateInputs").mockImplementation(() => {});

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((resolve) => {
          resolve({
            data: [],
            error: null,
          });
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      await categoryService.getCategories({ type: "income" }, "user123");

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("category_type", "income");
    });

    it("should include inactive categories when requested", async () => {
      vi.spyOn(categoryService as any, "validateInputs").mockImplementation(() => {});

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((resolve) => {
          resolve({
            data: [],
            error: null,
          });
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      await categoryService.getCategories({ include_inactive: true }, "user123");

      // Should not call eq with active filter
      expect(mockQueryBuilder.eq).not.toHaveBeenCalledWith("active", true);
    });

    it("should handle mapping errors gracefully", async () => {
      vi.spyOn(categoryService as any, "validateInputs").mockImplementation(() => {});

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((resolve) => {
          resolve({
            data: [null], // Invalid data that will cause mapping error
            error: null,
          });
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      await expect(categoryService.getCategories({}, "user123")).rejects.toThrow("Failed to map category at index 0");
    });
  });

  describe("getCategoryType", () => {
    it("should return category type successfully", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: "expense", error: null });

      const result = await categoryService["getCategoryType"](1);

      expect(result).toBe("expense");
      expect(mockSupabase.rpc).toHaveBeenCalledWith("get_category_type", {
        p_category_id: 1,
      });
    });

    it("should throw error on database failure", async () => {
      mockSupabase.rpc.mockResolvedValue({
        error: { code: "500", message: "Database error" },
      });

      await expect(categoryService["getCategoryType"](1)).rejects.toThrow(
        "Failed to get category type: Database error"
      );
    });
  });
});

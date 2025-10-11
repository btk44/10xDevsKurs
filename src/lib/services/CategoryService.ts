import type { supabaseClient } from "../../db/supabase.client";
import type {
  CategoryDTO,
  CreateCategoryCommand,
  UpdateCategoryCommand,
  CategoryType,
  GetCategoriesQuery,
} from "../../types";

/**
 * Service class for managing category operations
 * Handles category creation, validation, and business logic
 *
 * Performance Notes:
 * - validateParentCategory(): Uses idx_categories_user_active index efficiently
 * - validateCategoryNameUniqueness(): Uses idx_categories_user_active or idx_categories_parent index
 * - All queries filter by user_id first to leverage RLS and indexes
 * - Queries are optimized to select only required fields
 */
export class CategoryService {
  private supabase: typeof supabaseClient;

  constructor(supabase: typeof supabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Creates a new category for the specified user
   * @param command - The category creation command with validated data
   * @param userId - The user ID who owns the category
   * @returns Promise<CategoryDTO> - The created category
   * @throws Error if parent validation fails or database operation fails
   */
  async createCategory(command: CreateCategoryCommand, userId: string): Promise<CategoryDTO> {
    try {
      // Validate inputs
      this.validateInputs(userId, command.name);

      // Validate parent category if parent_id > 0
      if (command.parent_id && command.parent_id > 0) {
        await this.validateParentCategory(command.parent_id, userId, command.category_type || "expense");
      }

      // Check for name uniqueness within the same parent and user scope
      await this.validateCategoryNameUniqueness(command.name, command.parent_id || 0, userId);

      // Insert the new category with optimized field selection
      const { data, error } = await this.supabase
        .from("categories")
        .insert({
          name: command.name.trim(), // Ensure trimmed name
          category_type: command.category_type,
          parent_id: command.parent_id || 0,
          tag: command.tag?.trim() || null, // Ensure trimmed tag
          user_id: userId,
        })
        .select("id, user_id, name, category_type, parent_id, tag, active, created_at, updated_at")
        .single();

      if (error) {
        // Handle specific database constraint violations
        if (error.code === "23505") {
          // Unique constraint violation - this could happen due to race conditions
          throw new Error("A category with this name already exists in the same location");
        }
        if (error.code === "23503") {
          // Foreign key constraint violation
          throw new Error("Referenced parent category is invalid");
        }
        throw new Error(`Failed to create category: ${error.message}`);
      }

      return this.mapToCategoryDTO(data);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to create category: ${error}`);
    }
  }

  /**
   * Updates an existing category for the specified user
   * @param categoryId - The ID of the category to update
   * @param command - The category update command with validated data
   * @param userId - The user ID who owns the category
   * @returns Promise<CategoryDTO> - The updated category
   * @throws Error if category not found, validation fails, or database operation fails
   */
  async updateCategory(categoryId: number, command: UpdateCategoryCommand, userId: string): Promise<CategoryDTO> {
    try {
      // Validate inputs
      this.validateInputs(userId);

      if (categoryId <= 0) {
        throw new Error("Valid category ID is required");
      }

      // Check if category exists and belongs to user
      const existingCategory = await this.getCategoryById(categoryId, userId);
      if (!existingCategory) {
        throw new Error("Category not found or access denied");
      }

      // Validate parent category if parent_id is being changed
      if (command.parent_id !== undefined && command.parent_id > 0) {
        // Prevent self-referencing
        if (command.parent_id === categoryId) {
          throw new Error("Category cannot be its own parent");
        }

        // Validate parent category exists and is compatible
        const categoryType = command.category_type || existingCategory.category_type;
        await this.validateParentCategory(command.parent_id, userId, categoryType);
      }

      // Validate name uniqueness if name is being changed
      if (command.name && command.name !== existingCategory.name) {
        const parentId = command.parent_id !== undefined ? command.parent_id : existingCategory.parent_id;
        await this.validateCategoryNameUniqueness(command.name, parentId, userId, categoryId);
      }

      // Build update object with only provided fields
      const updateData: Record<string, unknown> = {};

      if (command.name !== undefined) {
        updateData.name = command.name.trim();
      }

      if (command.category_type !== undefined) {
        updateData.category_type = command.category_type;
      }

      if (command.parent_id !== undefined) {
        updateData.parent_id = command.parent_id;
      }

      if (command.tag !== undefined) {
        updateData.tag = command.tag?.trim() || null;
      }

      // Update the category
      const { data, error } = await this.supabase
        .from("categories")
        .update(updateData)
        .eq("id", categoryId)
        .eq("user_id", userId)
        .select("id, user_id, name, category_type, parent_id, tag, active, created_at, updated_at")
        .single();

      if (error) {
        // Handle specific database constraint violations
        if (error.code === "23505") {
          throw new Error("A category with this name already exists in the same location");
        }
        if (error.code === "23503") {
          throw new Error("Referenced parent category is invalid");
        }
        if (error.code === "PGRST116") {
          throw new Error("Category not found or access denied");
        }
        throw new Error(`Failed to update category: ${error.message}`);
      }

      return this.mapToCategoryDTO(data);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to update category: ${error}`);
    }
  }

  /**
   * Retrieves a category by ID for the specified user
   * @param categoryId - The category ID to retrieve
   * @param userId - The user ID who owns the category
   * @returns Promise<CategoryDTO | null> - The category or null if not found
   * @throws Error if database operation fails
   */
  async getCategoryById(categoryId: number, userId: string): Promise<CategoryDTO | null> {
    try {
      const { data, error } = await this.supabase
        .from("categories")
        .select("id, user_id, name, category_type, parent_id, tag, active, created_at, updated_at")
        .eq("user_id", userId)
        .eq("id", categoryId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // Category not found
        }
        throw new Error(`Failed to retrieve category: ${error.message}`);
      }

      return this.mapToCategoryDTO(data);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to retrieve category: ${error}`);
    }
  }

  /**
   * Retrieves categories for the specified user with optional filtering
   * @param query - Query parameters for filtering categories
   * @param userId - The user ID who owns the categories
   * @returns Promise<CategoryDTO[]> - Array of categories matching the criteria
   * @throws Error if database operation fails
   */
  async getCategories(query: GetCategoriesQuery, userId: string): Promise<CategoryDTO[]> {
    try {
      // Validate inputs
      this.validateInputs(userId);

      // Build the query with optimized field selection and filtering
      let queryBuilder = this.supabase
        .from("categories")
        .select("id, user_id, name, category_type, parent_id, tag, active, created_at, updated_at")
        .eq("user_id", userId); // RLS filter first for index optimization

      // Apply active filter (default to active only unless include_inactive is true)
      if (!query.include_inactive) {
        queryBuilder = queryBuilder.eq("active", true);
      }

      // Apply category type filter if provided
      if (query.type) {
        queryBuilder = queryBuilder.eq("category_type", query.type);
      }

      // Apply parent_id filter if provided (including 0 for main categories)
      if (query.parent_id !== undefined) {
        queryBuilder = queryBuilder.eq("parent_id", query.parent_id);
      }

      // Order by parent_id first (main categories first), then by name for consistent results
      queryBuilder = queryBuilder.order("parent_id", { ascending: true }).order("name", { ascending: true });

      const { data, error } = await queryBuilder;

      if (error) {
        // Handle specific Supabase error codes
        if (error.code === "PGRST301") {
          throw new Error("Failed to retrieve categories: Database connection timeout");
        }
        if (error.code === "PGRST116") {
          // No rows found - this is actually OK for this endpoint
          return [];
        }
        throw new Error(`Failed to retrieve categories: ${error.message}`);
      }

      // Handle edge case: null or undefined data
      if (!data) {
        return [];
      }

      // Map database results to CategoryDTO format with error handling
      return data.map((category, index) => {
        try {
          return this.mapToCategoryDTO(category);
        } catch (mappingError) {
          throw new Error(
            `Failed to map category at index ${index}: ${mappingError instanceof Error ? mappingError.message : mappingError}`
          );
        }
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to retrieve categories: ${error}`);
    }
  }

  /**
   * Soft deletes a category by setting its active flag to false
   * Validates that the category has no active transactions before deletion
   * @param categoryId - The category ID to delete
   * @param userId - The user ID who owns the category
   * @returns Promise<void> - Resolves on successful deletion
   * @throws Error if category not found, has active transactions, or database operation fails
   */
  async deleteCategory(categoryId: number, userId: string): Promise<void> {
    try {
      // Validate inputs
      this.validateInputs(userId);

      if (categoryId <= 0) {
        throw new Error("Valid category ID is required");
      }

      // Check if category exists and belongs to user
      const existingCategory = await this.getCategoryById(categoryId, userId);
      if (!existingCategory) {
        throw new Error("Category not found or access denied");
      }

      // Check for active transactions associated with this category
      const { count, error: countError } = await this.supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("category_id", categoryId)
        .eq("user_id", userId)
        .eq("active", true);

      if (countError) {
        throw new Error(`Failed to check category usage: ${countError.message}`);
      }

      // If there are active transactions, prevent deletion
      if (count && count > 0) {
        throw new Error(`Cannot delete category with active transactions: ${count} transaction(s) found`);
      }

      // Perform soft delete by setting active = false
      const { error: updateError } = await this.supabase
        .from("categories")
        .update({ active: false })
        .eq("id", categoryId)
        .eq("user_id", userId);

      if (updateError) {
        if (updateError.code === "PGRST116") {
          throw new Error("Category not found or access denied");
        }
        throw new Error(`Failed to delete category: ${updateError.message}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to delete category: ${error}`);
    }
  }

  /**
   * Validates that a parent category exists, is active, belongs to the user,
   * is not a subcategory itself, and matches the expected type
   * @param parentId - The parent category ID to validate
   * @param userId - The user ID for ownership validation
   * @param expectedType - The expected category type that must match parent
   * @throws Error if validation fails
   */
  async validateParentCategory(parentId: number, userId: string, expectedType: CategoryType): Promise<void> {
    try {
      // Optimized query: only select required fields and use indexed columns first
      // This will use idx_categories_user_active index efficiently
      const { data, error } = await this.supabase
        .from("categories")
        .select("category_type, parent_id")
        .eq("user_id", userId)
        .eq("active", true)
        .eq("id", parentId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          throw new Error("Parent category does not exist or is not active");
        }
        throw new Error(`Failed to validate parent category: ${error.message}`);
      }

      // Check if parent is already a subcategory (would create 3-level hierarchy)
      if (data.parent_id > 0) {
        throw new Error("Maximum category depth is 2 levels");
      }

      // Check if category types match
      if (data.category_type !== expectedType) {
        throw new Error("Subcategory type must match parent category type");
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to validate parent category: ${error}`);
    }
  }

  /**
   * Validates that a category name is unique within the same parent and user scope
   * @param name - The category name to check
   * @param parentId - The parent category ID (0 for main categories)
   * @param userId - The user ID for ownership validation
   * @param excludeCategoryId - Optional category ID to exclude from uniqueness check (for updates)
   * @throws Error if name already exists
   */
  async validateCategoryNameUniqueness(
    name: string,
    parentId: number,
    userId: string,
    excludeCategoryId?: number
  ): Promise<void> {
    try {
      // Use optimized query with indexed columns first
      // This will use idx_categories_user_active or idx_categories_parent index
      let queryBuilder = this.supabase
        .from("categories")
        .select("id")
        .eq("user_id", userId)
        .eq("active", true)
        .eq("parent_id", parentId)
        .ilike("name", name.trim())
        .limit(1);

      // Exclude the current category from uniqueness check (for updates)
      if (excludeCategoryId) {
        queryBuilder = queryBuilder.neq("id", excludeCategoryId);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        throw new Error(`Failed to check category name uniqueness: ${error.message}`);
      }

      if (data && data.length > 0) {
        throw new Error("A category with this name already exists in the same location");
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to check category name uniqueness: ${error}`);
    }
  }

  /**
   * Alternative validation method using database function for better performance
   * This could be used if we need to validate category type without a separate query
   * @param categoryId - The category ID to get type for
   * @returns Promise<CategoryType> - The category type
   */
  async getCategoryType(categoryId: number): Promise<CategoryType> {
    try {
      const { data, error } = await this.supabase.rpc("get_category_type", {
        p_category_id: categoryId,
      });

      if (error) {
        throw new Error(`Failed to get category type: ${error.message}`);
      }

      return data as CategoryType;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to get category type: ${error}`);
    }
  }

  /**
   * Maps database category result to CategoryDTO with type safety
   * @param dbResult - Raw database result
   * @returns CategoryDTO - Formatted category data transfer object
   */
  private mapToCategoryDTO(dbResult: Record<string, unknown>): CategoryDTO {
    // Ensure all required fields are present and properly typed
    if (!dbResult || typeof dbResult !== "object") {
      throw new Error("Invalid database result for category mapping");
    }

    return {
      id: Number(dbResult.id),
      user_id: String(dbResult.user_id),
      name: String(dbResult.name),
      category_type: dbResult.category_type as CategoryType,
      parent_id: Number(dbResult.parent_id),
      tag: dbResult.tag ? String(dbResult.tag) : null,
      active: Boolean(dbResult.active),
      created_at: String(dbResult.created_at),
      updated_at: String(dbResult.updated_at),
    };
  }

  /**
   * Validates input parameters for category operations
   * @param userId - User ID to validate
   * @param categoryName - Category name to validate
   * @throws Error if validation fails
   */
  private validateInputs(userId: string, categoryName?: string): void {
    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
      throw new Error("Valid user ID is required");
    }

    if (categoryName !== undefined) {
      if (!categoryName || typeof categoryName !== "string" || categoryName.trim().length === 0) {
        throw new Error("Valid category name is required");
      }
      if (categoryName.trim().length > 100) {
        throw new Error("Category name cannot exceed 100 characters");
      }
    }
  }
}

import { useState, useEffect } from "react";
import type { CategoryDTO, CategoryType, ApiCollectionResponse } from "../../../types";
import type { CategoryViewModel } from "../CategoriesPage";

export const useCategories = (type: CategoryType) => {
  const [categories, setCategories] = useState<CategoryViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/categories?type=${type}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.statusText}`);
      }

      const data: ApiCollectionResponse<CategoryDTO> = await response.json();
      const viewModels = buildCategoryViewModels(data.data);
      setCategories(viewModels);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch categories");
    } finally {
      setLoading(false);
    }
  };

  // Build hierarchical view models from flat DTO array
  const buildCategoryViewModels = (categoryDTOs: CategoryDTO[]): CategoryViewModel[] => {
    // First, create a map of all categories
    const categoryMap = new Map<number, CategoryViewModel>();

    // Initialize all categories with empty children arrays
    categoryDTOs.forEach((dto) => {
      categoryMap.set(dto.id, {
        ...dto,
        children: [],
        level: 0,
      });
    });

    // Build the hierarchy
    const rootCategories: CategoryViewModel[] = [];

    categoryDTOs.forEach((dto) => {
      const category = categoryMap.get(dto.id);

      if (category) {
        if (dto.parent_id === 0) {
          // This is a root category
          rootCategories.push(category);
        } else {
          // This is a child category
          const parent = categoryMap.get(dto.parent_id);
          if (parent) {
            parent.children.push(category);
            category.level = 1; // Set level for subcategories
          } else {
            // If parent doesn't exist, treat as root
            rootCategories.push(category);
          }
        }
      }
    });

    // Flatten the hierarchy for display
    return flattenCategoryHierarchy(rootCategories);
  };

  // Flatten the hierarchy into a single-level array for display
  const flattenCategoryHierarchy = (categories: CategoryViewModel[]): CategoryViewModel[] => {
    const result: CategoryViewModel[] = [];

    const addCategoryAndChildren = (category: CategoryViewModel) => {
      result.push(category);

      // Add all children
      category.children.forEach((child) => {
        addCategoryAndChildren(child);
      });
    };

    // Process all root categories
    categories.forEach((category) => {
      addCategoryAndChildren(category);
    });

    return result;
  };

  // Fetch categories when type changes
  useEffect(() => {
    fetchCategories();
  }, [type]);

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
  };
};

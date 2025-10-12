import { useState, useEffect } from "react";
import type { ApiCollectionResponse, CategoryDTO, GetCategoriesQuery } from "../../../types";

/**
 * Custom hook to fetch categories
 */
export function useCategories(filters: Partial<GetCategoriesQuery> = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<CategoryDTO[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const queryParams = new URLSearchParams();
        
        if (filters.type) queryParams.append("type", filters.type);
        if (filters.parent_id) queryParams.append("parent_id", filters.parent_id.toString());
        if (filters.include_inactive !== undefined) queryParams.append("include_inactive", filters.include_inactive.toString());
        
        const response = await fetch(`/api/categories?${queryParams.toString()}`);
        
        if (!response.ok) {
          throw new Error(`Error fetching categories: ${response.status}`);
        }
        
        const result = await response.json() as ApiCollectionResponse<CategoryDTO>;
        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error occurred"));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCategories();
  }, [filters.type, filters.parent_id, filters.include_inactive]);
  
  return { data, isLoading, error };
}

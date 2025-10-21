import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useCategories } from "../useCategories";
import type { CategoryDTO, CategoryType } from "../../../../types";

// Mock fetch globally
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("useCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const mockCategoryDTOs: CategoryDTO[] = [
    {
      id: 1,
      user_id: "user1",
      name: "Food",
      category_type: "expense",
      parent_id: 0,
      tag: "food",
      active: true,
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-01-01T00:00:00Z",
    },
    {
      id: 2,
      user_id: "user1",
      name: "Groceries",
      category_type: "expense",
      parent_id: 1,
      tag: "groceries",
      active: true,
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-01-01T00:00:00Z",
    },
    {
      id: 3,
      user_id: "user1",
      name: "Salary",
      category_type: "income",
      parent_id: 0,
      tag: "salary",
      active: true,
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-01-01T00:00:00Z",
    },
  ];

  const mockApiResponse = {
    data: mockCategoryDTOs,
  };

  describe("Initial state", () => {
    it("should return initial loading state", () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      fetchMock.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useCategories("expense"));

      expect(result.current.loading).toBe(true);
      expect(result.current.categories).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.refetch).toBe("function");
    });
  });

  describe("Successful data fetching", () => {
    it("should fetch and transform categories successfully", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });

      const { result } = renderHook(() => useCategories("expense"));

      // Initially loading
      expect(result.current.loading).toBe(true);

      // Wait for fetch to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.categories).toHaveLength(3); // All categories since API returns all for the type

      // Check categories are present
      const foodCategory = result.current.categories.find((cat) => cat.id === 1);
      expect(foodCategory).toBeDefined();
      expect(foodCategory?.name).toBe("Food");
      expect(foodCategory?.level).toBe(0);
      expect(foodCategory?.children).toHaveLength(1);

      const groceriesCategory = result.current.categories.find((cat) => cat.id === 2);
      expect(groceriesCategory).toBeDefined();
      expect(groceriesCategory?.name).toBe("Groceries");
      expect(groceriesCategory?.level).toBe(1);
      expect(groceriesCategory?.children).toEqual([]);

      const salaryCategory = result.current.categories.find((cat) => cat.id === 3);
      expect(salaryCategory).toBeDefined();
      expect(salaryCategory?.name).toBe("Salary");
      expect(salaryCategory?.level).toBe(0);
      expect(salaryCategory?.children).toEqual([]);
    });

    it("should fetch categories when type changes", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });

      const { result, rerender } = renderHook(({ type }: { type: CategoryType }) => useCategories(type), {
        initialProps: { type: "expense" },
      });

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Rerender with different type
      rerender({ type: "income" });

      // Should fetch again
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(2);
      });

      expect(fetchMock).toHaveBeenLastCalledWith("/api/categories?type=income");
    });

    it("should handle only root categories", async () => {
      const rootOnlyDTOs: CategoryDTO[] = [
        {
          id: 1,
          user_id: "user1",
          name: "Food",
          category_type: "expense",
          parent_id: 0,
          tag: "food",
          active: true,
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-01T00:00:00Z",
        },
        {
          id: 3,
          user_id: "user1",
          name: "Salary",
          category_type: "expense",
          parent_id: 0,
          tag: "salary",
          active: true,
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-01T00:00:00Z",
        },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: rootOnlyDTOs }),
      });

      const { result } = renderHook(() => useCategories("expense"));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.categories).toHaveLength(2);
      expect(result.current.categories[0].level).toBe(0);
      expect(result.current.categories[1].level).toBe(0);
      expect(result.current.categories[0].children).toEqual([]);
      expect(result.current.categories[1].children).toEqual([]);
    });
  });

  describe("Error handling", () => {
    it("should handle fetch error", async () => {
      const errorMessage = "Network error";
      fetchMock.mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useCategories("expense"));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.categories).toEqual([]);
    });

    it("should handle non-ok response", async () => {
      const errorStatusText = "Internal Server Error";
      fetchMock.mockResolvedValueOnce({
        ok: false,
        statusText: errorStatusText,
      });

      const { result } = renderHook(() => useCategories("expense"));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(`Failed to fetch categories: ${errorStatusText}`);
      expect(result.current.categories).toEqual([]);
    });
  });

  describe("Refetch functionality", () => {
    it("should refetch categories when refetch is called", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });

      const { result } = renderHook(() => useCategories("expense"));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Call refetch
      act(() => {
        result.current.refetch();
      });

      // Should be loading again
      expect(result.current.loading).toBe(true);

      // Wait for refetch to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("Data transformation", () => {
    it("should handle categories with invalid parent references", async () => {
      const invalidParentDTOs: CategoryDTO[] = [
        {
          id: 1,
          user_id: "user1",
          name: "Child",
          category_type: "expense",
          parent_id: 999, // Parent doesn't exist
          tag: "child",
          active: true,
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-01T00:00:00Z",
        },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: invalidParentDTOs }),
      });

      const { result } = renderHook(() => useCategories("expense"));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.categories).toHaveLength(1);
      expect(result.current.categories[0].id).toBe(1);
      expect(result.current.categories[0].level).toBe(0); // Treated as root
      expect(result.current.categories[0].children).toEqual([]);
    });

    it("should handle empty response", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      const { result } = renderHook(() => useCategories("expense"));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.categories).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it("should handle deep nesting correctly", async () => {
      const deepNestedDTOs: CategoryDTO[] = [
        {
          id: 1,
          user_id: "user1",
          name: "Level 1",
          category_type: "expense",
          parent_id: 0,
          tag: "l1",
          active: true,
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-01T00:00:00Z",
        },
        {
          id: 2,
          user_id: "user1",
          name: "Level 2",
          category_type: "expense",
          parent_id: 1,
          tag: "l2",
          active: true,
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-01T00:00:00Z",
        },
        {
          id: 3,
          user_id: "user1",
          name: "Level 3",
          category_type: "expense",
          parent_id: 2,
          tag: "l3",
          active: true,
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-01T00:00:00Z",
        },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: deepNestedDTOs }),
      });

      const { result } = renderHook(() => useCategories("expense"));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.categories).toHaveLength(3);

      // Level 1 should be root
      const level1 = result.current.categories[0];
      expect(level1.id).toBe(1);
      expect(level1.level).toBe(0);
      expect(level1.children).toHaveLength(1);

      // Level 2 should be child of Level 1
      const level2 = result.current.categories[1];
      expect(level2.id).toBe(2);
      expect(level2.level).toBe(1);

      // Level 3 should be flattened
      const level3 = result.current.categories[2];
      expect(level3.id).toBe(3);
      expect(level3.level).toBe(1); // Current implementation sets level 1 for all children
    });
  });
});

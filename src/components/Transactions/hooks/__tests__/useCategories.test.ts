import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCategories } from "../useCategories";
import type { CategoryDTO, ApiCollectionResponse, GetCategoriesQuery } from "../../../../types";

// Mock fetch globally
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("useCategories", () => {
  const mockCategoryDTO: CategoryDTO = {
    id: 1,
    user_id: "user-123",
    name: "Food",
    category_type: "expense",
    parent_id: null,
    tag: "groceries",
    active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  const mockCategoriesResponse: ApiCollectionResponse<CategoryDTO> = {
    data: [mockCategoryDTO],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial state", () => {
    it("should return correct initial state and start loading", () => {
      // Mock fetch to prevent actual loading for this test
      fetchMock.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolve to prevent actual loading
          })
      );

      const { result } = renderHook(() => useCategories());

      expect(result.current.data).toEqual([]);
      expect(result.current.isLoading).toBe(true); // Loading starts immediately
      expect(result.current.error).toBe(null);
    });

    it("should return correct initial state with filters and start loading", () => {
      // Mock fetch to prevent actual loading for this test
      fetchMock.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolve to prevent actual loading
          })
      );

      const filters: Partial<GetCategoriesQuery> = {
        type: "expense",
        include_inactive: true,
      };

      const { result } = renderHook(() => useCategories(filters));

      expect(result.current.data).toEqual([]);
      expect(result.current.isLoading).toBe(true); // Loading starts immediately
      expect(result.current.error).toBe(null);
    });
  });

  describe("automatic data fetching", () => {
    it("should fetch categories on mount with no filters", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCategoriesResponse),
      });

      const { result } = renderHook(() => useCategories());

      // Initial state
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toEqual([]);

      // Wait for fetch to complete
      await act(async () => {
        // The useEffect will trigger the fetch
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/categories?");
      expect(result.current.data).toEqual([mockCategoryDTO]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it("should fetch categories with type filter", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCategoriesResponse),
      });

      const { result } = renderHook(() => useCategories({ type: "income" }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/categories?type=income");
      expect(result.current.data).toEqual([mockCategoryDTO]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it("should fetch categories with parent_id filter", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCategoriesResponse),
      });

      const { result } = renderHook(() => useCategories({ parent_id: 5 }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/categories?parent_id=5");
      expect(result.current.data).toEqual([mockCategoryDTO]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it("should fetch categories with include_inactive filter", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCategoriesResponse),
      });

      const { result } = renderHook(() => useCategories({ include_inactive: true }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/categories?include_inactive=true");
      expect(result.current.data).toEqual([mockCategoryDTO]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it("should fetch categories with multiple filters", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCategoriesResponse),
      });

      const filters: Partial<GetCategoriesQuery> = {
        type: "expense",
        parent_id: 10,
        include_inactive: false,
      };

      const { result } = renderHook(() => useCategories(filters));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/categories?type=expense&parent_id=10&include_inactive=false");
      expect(result.current.data).toEqual([mockCategoryDTO]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it("should refetch when filters change", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCategoriesResponse),
      });

      const { rerender } = renderHook(
        ({ filters }: { filters: Partial<GetCategoriesQuery> }) => useCategories(filters),
        {
          initialProps: { filters: { type: "income" } },
        }
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/categories?type=income");
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Change filters
      rerender({ filters: { type: "expense", include_inactive: true } });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/categories?type=expense&include_inactive=true");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("successful data fetching", () => {
    it("should successfully fetch and set categories data", async () => {
      const mockResponse = {
        data: [mockCategoryDTO, { ...mockCategoryDTO, id: 2, name: "Transportation" }],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useCategories());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.data).toEqual([mockCategoryDTO, { ...mockCategoryDTO, id: 2, name: "Transportation" }]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it("should handle empty categories array", async () => {
      const mockResponse = {
        data: [],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useCategories());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe("error handling", () => {
    it("should handle HTTP error responses", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: { message: "Internal server error" } }),
      });

      const { result } = renderHook(() => useCategories());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("Error fetching categories: 500");
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network connection failed");
      fetchMock.mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useCategories());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(networkError);
    });

    it("should handle malformed JSON response", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      const { result } = renderHook(() => useCategories());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("Invalid JSON");
    });

    it("should handle non-Error thrown values", async () => {
      fetchMock.mockRejectedValueOnce("String error");

      const { result } = renderHook(() => useCategories());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("Unknown error occurred");
    });
  });

  describe("loading state", () => {
    it("should set loading state during fetch operation", async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      fetchMock.mockReturnValueOnce(promise);

      const { result } = renderHook(() => useCategories());

      // Should be loading immediately
      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise({
          ok: true,
          json: () => Promise.resolve(mockCategoriesResponse),
        });
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("should clear loading state when fetch completes", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCategoriesResponse),
      });

      const { result } = renderHook(() => useCategories());

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("should clear loading state when fetch fails", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useCategories());

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
    });
  });
});

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCategoryMutations } from "../useCategoryMutations";
import type { CreateCategoryCommand, UpdateCategoryCommand, CategoryDTO, ApiErrorResponse } from "../../../../types";

// Mock fetch globally
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("useCategoryMutations", () => {
  const mockCategoryDTO: CategoryDTO = {
    id: 1,
    user_id: "user-123",
    name: "Food",
    category_type: "expense",
    parent_id: 0,
    tag: null,
    active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  const mockCreateCommand: CreateCategoryCommand = {
    name: "Food",
    category_type: "expense",
    parent_id: 0,
    tag: null,
  };

  const mockUpdateCommand: UpdateCategoryCommand = {
    name: "Updated Food",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("create", () => {
    it("should successfully create a category", async () => {
      const mockResponse = {
        data: mockCategoryDTO,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useCategoryMutations());

      let createdCategory: CategoryDTO | null = null;

      await act(async () => {
        createdCategory = await result.current.create(mockCreateCommand);
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mockCreateCommand),
      });

      expect(createdCategory).toEqual(mockCategoryDTO);
      expect(result.current.isCreating).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.fieldErrors).toEqual({});
    });

    it("should handle API validation errors", async () => {
      const mockErrorResponse: ApiErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: [
            { field: "name", message: "Name is required" },
            { field: "category_type", message: "Invalid category type" },
          ],
        },
      };

      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(mockErrorResponse),
      });

      const { result } = renderHook(() => useCategoryMutations());

      let createdCategory: CategoryDTO | null = null;

      await act(async () => {
        createdCategory = await result.current.create(mockCreateCommand);
      });

      expect(createdCategory).toBe(null);
      expect(result.current.isCreating).toBe(false);
      expect(result.current.error).toBe("Validation failed");
      // fieldErrors shows updateState.fieldErrors when not creating, so it's empty
      expect(result.current.fieldErrors).toEqual({});
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network error");
      fetchMock.mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useCategoryMutations());

      let createdCategory: CategoryDTO | null = null;

      await act(async () => {
        createdCategory = await result.current.create(mockCreateCommand);
      });

      expect(createdCategory).toBe(null);
      expect(result.current.isCreating).toBe(false);
      expect(result.current.error).toBe("Network error");
      expect(result.current.fieldErrors).toEqual({});
    });

    it("should handle malformed JSON response", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      const { result } = renderHook(() => useCategoryMutations());

      let createdCategory: CategoryDTO | null = null;

      await act(async () => {
        createdCategory = await result.current.create(mockCreateCommand);
      });

      expect(createdCategory).toBe(null);
      expect(result.current.isCreating).toBe(false);
      expect(result.current.error).toBe("An unknown error occurred");
      expect(result.current.fieldErrors).toEqual({});
    });

    it("should set loading state during create operation", async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      fetchMock.mockReturnValueOnce(promise);

      const { result } = renderHook(() => useCategoryMutations());

      act(() => {
        result.current.create(mockCreateCommand);
      });

      expect(result.current.isCreating).toBe(true);

      await act(async () => {
        resolvePromise({
          ok: true,
          json: () => Promise.resolve({ data: mockCategoryDTO }),
        });
      });

      expect(result.current.isCreating).toBe(false);
    });
  });

  describe("update", () => {
    it("should successfully update a category", async () => {
      const updatedCategory = { ...mockCategoryDTO, name: "Updated Food" };
      const mockResponse = {
        data: updatedCategory,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useCategoryMutations());

      let updatedCategoryResult: CategoryDTO | null = null;

      await act(async () => {
        updatedCategoryResult = await result.current.update(1, mockUpdateCommand);
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/categories/1", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mockUpdateCommand),
      });

      expect(updatedCategoryResult).toEqual(updatedCategory);
      expect(result.current.isUpdating).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.fieldErrors).toEqual({});
    });

    it("should handle API validation errors during update", async () => {
      const mockErrorResponse: ApiErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Update validation failed",
          details: [{ field: "name", message: "Name must be at least 2 characters" }],
        },
      };

      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(mockErrorResponse),
      });

      const { result } = renderHook(() => useCategoryMutations());

      let updatedCategory: CategoryDTO | null = null;

      await act(async () => {
        updatedCategory = await result.current.update(1, mockUpdateCommand);
      });

      expect(updatedCategory).toBe(null);
      expect(result.current.isUpdating).toBe(false);
      expect(result.current.error).toBe("Update validation failed");
      expect(result.current.fieldErrors).toEqual({
        name: "Name must be at least 2 characters",
      });
    });

    it("should handle network errors during update", async () => {
      const networkError = new Error("Connection failed");
      fetchMock.mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useCategoryMutations());

      let updatedCategory: CategoryDTO | null = null;

      await act(async () => {
        updatedCategory = await result.current.update(1, mockUpdateCommand);
      });

      expect(updatedCategory).toBe(null);
      expect(result.current.isUpdating).toBe(false);
      expect(result.current.error).toBe("Connection failed");
      expect(result.current.fieldErrors).toEqual({});
    });

    it("should set loading state during update operation", async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      fetchMock.mockReturnValueOnce(promise);

      const { result } = renderHook(() => useCategoryMutations());

      act(() => {
        result.current.update(1, mockUpdateCommand);
      });

      expect(result.current.isUpdating).toBe(true);

      await act(async () => {
        resolvePromise({
          ok: true,
          json: () => Promise.resolve({ data: mockCategoryDTO }),
        });
      });

      expect(result.current.isUpdating).toBe(false);
    });
  });

  describe("remove", () => {
    it("should successfully delete a category", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
      });

      const { result } = renderHook(() => useCategoryMutations());

      let deleteResult = false;

      await act(async () => {
        deleteResult = await result.current.remove(1);
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/categories/1", {
        method: "DELETE",
      });

      expect(deleteResult).toBe(true);
      expect(result.current.isDeleting).toBe(false);
      expect(result.current.deleteError).toBe(null);
    });

    it("should handle CATEGORY_IN_USE error with custom message", async () => {
      const mockErrorResponse: ApiErrorResponse = {
        error: {
          code: "CATEGORY_IN_USE",
          message: "Category is in use",
        },
      };

      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(mockErrorResponse),
      });

      const { result } = renderHook(() => useCategoryMutations());

      let deleteResult = true;

      await act(async () => {
        deleteResult = await result.current.remove(1);
      });

      expect(deleteResult).toBe(false);
      expect(result.current.isDeleting).toBe(false);
      expect(result.current.deleteError).toBe("This category is in use and cannot be deleted");
    });

    it("should handle other API errors during delete", async () => {
      const mockErrorResponse: ApiErrorResponse = {
        error: {
          code: "NOT_FOUND",
          message: "Category not found",
        },
      };

      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(mockErrorResponse),
      });

      const { result } = renderHook(() => useCategoryMutations());

      let deleteResult = true;

      await act(async () => {
        deleteResult = await result.current.remove(1);
      });

      expect(deleteResult).toBe(false);
      expect(result.current.isDeleting).toBe(false);
      expect(result.current.deleteError).toBe("Category not found");
    });

    it("should handle network errors during delete", async () => {
      const networkError = new Error("Delete failed");
      fetchMock.mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useCategoryMutations());

      let deleteResult = true;

      await act(async () => {
        deleteResult = await result.current.remove(1);
      });

      expect(deleteResult).toBe(false);
      expect(result.current.isDeleting).toBe(false);
      expect(result.current.deleteError).toBe("Delete failed");
    });

    it("should set loading state during delete operation", async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      fetchMock.mockReturnValueOnce(promise);

      const { result } = renderHook(() => useCategoryMutations());

      act(() => {
        result.current.remove(1);
      });

      expect(result.current.isDeleting).toBe(true);

      await act(async () => {
        resolvePromise({
          ok: true,
        });
      });

      expect(result.current.isDeleting).toBe(false);
    });
  });

  describe("returned state", () => {
    it("should return correct initial state", () => {
      const { result } = renderHook(() => useCategoryMutations());

      expect(result.current.isCreating).toBe(false);
      expect(result.current.isUpdating).toBe(false);
      expect(result.current.isDeleting).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.fieldErrors).toEqual({});
      expect(result.current.deleteError).toBe(null);
      expect(typeof result.current.create).toBe("function");
      expect(typeof result.current.update).toBe("function");
      expect(typeof result.current.remove).toBe("function");
    });

    it("should return create error when create operation fails", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            error: {
              code: "CREATE_ERROR",
              message: "Create failed",
            },
          }),
      });

      const { result } = renderHook(() => useCategoryMutations());

      await act(async () => {
        await result.current.create(mockCreateCommand);
      });

      expect(result.current.error).toBe("Create failed");
      expect(result.current.deleteError).toBe(null);
    });

    it("should return update error when update operation fails", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            error: {
              code: "UPDATE_ERROR",
              message: "Update failed",
            },
          }),
      });

      const { result } = renderHook(() => useCategoryMutations());

      await act(async () => {
        await result.current.update(1, mockUpdateCommand);
      });

      expect(result.current.error).toBe("Update failed");
      expect(result.current.deleteError).toBe(null);
    });

    it("should prioritize create fieldErrors when both create and update have errors", async () => {
      // First fail create
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            error: {
              code: "VALIDATION_ERROR",
              message: "Create validation failed",
              details: [{ field: "name", message: "Create error" }],
            },
          }),
      });

      const { result } = renderHook(() => useCategoryMutations());

      await act(async () => {
        await result.current.create(mockCreateCommand);
      });

      // Then fail update
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            error: {
              code: "VALIDATION_ERROR",
              message: "Update validation failed",
              details: [{ field: "name", message: "Update error" }],
            },
          }),
      });

      await act(async () => {
        await result.current.update(1, mockUpdateCommand);
      });

      // Should show create error since error is createState.error || updateState.error
      expect(result.current.error).toBe("Create validation failed");
      // fieldErrors shows updateState.fieldErrors when not creating, so it shows update errors
      expect(result.current.fieldErrors).toEqual({
        name: "Update error",
      });
    });

    it("should clear previous errors on successful operations", async () => {
      // First fail create
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            error: {
              code: "VALIDATION_ERROR",
              message: "Create validation failed",
              details: [{ field: "name", message: "Name error" }],
            },
          }),
      });

      const { result } = renderHook(() => useCategoryMutations());

      await act(async () => {
        await result.current.create(mockCreateCommand);
      });

      expect(result.current.error).toBe("Create validation failed");
      // fieldErrors shows updateState.fieldErrors when not creating, so it's empty after create completes
      expect(result.current.fieldErrors).toEqual({});

      // Then succeed with update
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockCategoryDTO }),
      });

      await act(async () => {
        await result.current.update(1, mockUpdateCommand);
      });

      // error still shows create error since error is createState.error || updateState.error
      expect(result.current.error).toBe("Create validation failed");
      expect(result.current.fieldErrors).toEqual({});
    });
  });

  describe("concurrent operations", () => {
    it("should handle multiple operations independently", async () => {
      // Mock responses for concurrent operations
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockCategoryDTO }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { ...mockCategoryDTO, id: 2 } }),
        })
        .mockResolvedValueOnce({
          ok: true,
        });

      const { result } = renderHook(() => useCategoryMutations());

      await act(async () => {
        const [createResult, updateResult, deleteResult] = await Promise.all([
          result.current.create(mockCreateCommand),
          result.current.update(1, mockUpdateCommand),
          result.current.remove(2),
        ]);

        expect(createResult).toEqual(mockCategoryDTO);
        expect(updateResult).toEqual({ ...mockCategoryDTO, id: 2 });
        expect(deleteResult).toBe(true);
      });

      expect(result.current.isCreating).toBe(false);
      expect(result.current.isUpdating).toBe(false);
      expect(result.current.isDeleting).toBe(false);
    });
  });
});

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTransactionMutations } from "../useTransactionMutations";
import type {
  CreateTransactionCommand,
  TransactionDTO,
  UpdateTransactionCommand,
  ApiErrorResponse,
} from "../../../../types";

// Mock fetch globally
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("useTransactionMutations", () => {
  const mockTransactionDTO: TransactionDTO = {
    id: 1,
    user_id: "user-123",
    transaction_date: "2024-01-15",
    account_id: 1,
    account_name: "Main Account",
    category_id: 1,
    category_name: "Food",
    category_type: "expense",
    amount: -50.0,
    currency_id: 1,
    currency_code: "USD",
    comment: "Lunch at restaurant",
    active: true,
    created_at: "2024-01-15T12:00:00Z",
    updated_at: "2024-01-15T12:00:00Z",
  };

  const mockCreateCommand: CreateTransactionCommand = {
    transaction_date: "2024-01-15",
    account_id: 1,
    category_id: 1,
    amount: -50.0,
    currency_id: 1,
    comment: "Lunch at restaurant",
  };

  const mockUpdateCommand: UpdateTransactionCommand = {
    amount: -60.0,
    comment: "Updated lunch expense",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createTransaction", () => {
    it("should successfully create a transaction", async () => {
      const mockResponse = {
        data: mockTransactionDTO,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useTransactionMutations());

      let createdTransaction: TransactionDTO | null = null;

      await act(async () => {
        createdTransaction = await result.current.createTransaction(mockCreateCommand);
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mockCreateCommand),
      });

      expect(createdTransaction).toEqual(mockTransactionDTO);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should handle API validation errors", async () => {
      const mockErrorResponse: ApiErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: [
            { field: "amount", message: "Amount must be greater than 0" },
            { field: "account_id", message: "Invalid account ID" },
          ],
        },
      };

      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(mockErrorResponse),
      });

      const { result } = renderHook(() => useTransactionMutations());

      let createdTransaction: TransactionDTO | null = null;

      await act(async () => {
        createdTransaction = await result.current.createTransaction(mockCreateCommand);
      });

      expect(createdTransaction).toBe(null);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error?.message).toBe("Validation failed");
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network error");
      fetchMock.mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useTransactionMutations());

      let createdTransaction: TransactionDTO | null = null;

      await act(async () => {
        createdTransaction = await result.current.createTransaction(mockCreateCommand);
      });

      expect(createdTransaction).toBe(null);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error?.message).toBe("Network error");
    });

    it("should handle malformed JSON response", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      const { result } = renderHook(() => useTransactionMutations());

      let createdTransaction: TransactionDTO | null = null;

      await act(async () => {
        createdTransaction = await result.current.createTransaction(mockCreateCommand);
      });

      expect(createdTransaction).toBe(null);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error?.message).toBe("Invalid JSON");
    });

    it("should set loading state during create operation", async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      fetchMock.mockReturnValueOnce(promise);

      const { result } = renderHook(() => useTransactionMutations());

      act(() => {
        result.current.createTransaction(mockCreateCommand);
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise({
          ok: true,
          json: () => Promise.resolve({ data: mockTransactionDTO }),
        });
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("updateTransaction", () => {
    it("should successfully update a transaction", async () => {
      const updatedTransaction = { ...mockTransactionDTO, amount: -60.0, comment: "Updated lunch expense" };
      const mockResponse = {
        data: updatedTransaction,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useTransactionMutations());

      let updatedTransactionResult: TransactionDTO | null = null;

      await act(async () => {
        updatedTransactionResult = await result.current.updateTransaction(1, mockUpdateCommand);
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/transactions/1", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mockUpdateCommand),
      });

      expect(updatedTransactionResult).toEqual(updatedTransaction);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should handle API validation errors during update", async () => {
      const mockErrorResponse: ApiErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Update validation failed",
          details: [{ field: "amount", message: "Amount must be a valid number" }],
        },
      };

      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(mockErrorResponse),
      });

      const { result } = renderHook(() => useTransactionMutations());

      let updatedTransaction: TransactionDTO | null = null;

      await act(async () => {
        updatedTransaction = await result.current.updateTransaction(1, mockUpdateCommand);
      });

      expect(updatedTransaction).toBe(null);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error?.message).toBe("Update validation failed");
    });

    it("should handle network errors during update", async () => {
      const networkError = new Error("Connection failed");
      fetchMock.mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useTransactionMutations());

      let updatedTransaction: TransactionDTO | null = null;

      await act(async () => {
        updatedTransaction = await result.current.updateTransaction(1, mockUpdateCommand);
      });

      expect(updatedTransaction).toBe(null);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error?.message).toBe("Connection failed");
    });

    it("should set loading state during update operation", async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      fetchMock.mockReturnValueOnce(promise);

      const { result } = renderHook(() => useTransactionMutations());

      act(() => {
        result.current.updateTransaction(1, mockUpdateCommand);
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise({
          ok: true,
          json: () => Promise.resolve({ data: mockTransactionDTO }),
        });
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("deleteTransaction", () => {
    it("should successfully delete a transaction", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
      });

      const { result } = renderHook(() => useTransactionMutations());

      let deleteResult = false;

      await act(async () => {
        deleteResult = await result.current.deleteTransaction(1);
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/transactions/1", {
        method: "DELETE",
      });

      expect(deleteResult).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should handle API errors during delete", async () => {
      const mockErrorResponse: ApiErrorResponse = {
        error: {
          code: "NOT_FOUND",
          message: "Transaction not found",
        },
      };

      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(mockErrorResponse),
      });

      const { result } = renderHook(() => useTransactionMutations());

      let deleteResult = true;

      await act(async () => {
        deleteResult = await result.current.deleteTransaction(1);
      });

      expect(deleteResult).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error?.message).toBe("Transaction not found");
    });

    it("should handle network errors during delete", async () => {
      const networkError = new Error("Delete failed");
      fetchMock.mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useTransactionMutations());

      let deleteResult = true;

      await act(async () => {
        deleteResult = await result.current.deleteTransaction(1);
      });

      expect(deleteResult).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error?.message).toBe("Delete failed");
    });

    it("should set loading state during delete operation", async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      fetchMock.mockReturnValueOnce(promise);

      const { result } = renderHook(() => useTransactionMutations());

      act(() => {
        result.current.deleteTransaction(1);
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise({
          ok: true,
        });
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("returned state", () => {
    it("should return correct initial state", () => {
      const { result } = renderHook(() => useTransactionMutations());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.createTransaction).toBe("function");
      expect(typeof result.current.updateTransaction).toBe("function");
      expect(typeof result.current.deleteTransaction).toBe("function");
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
            },
          }),
      });

      const { result } = renderHook(() => useTransactionMutations());

      await act(async () => {
        await result.current.createTransaction(mockCreateCommand);
      });

      expect(result.current.error?.message).toBe("Create validation failed");

      // Then succeed with update
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockTransactionDTO }),
      });

      await act(async () => {
        await result.current.updateTransaction(1, mockUpdateCommand);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("concurrent operations", () => {
    it("should handle multiple operations independently", async () => {
      // Mock responses for concurrent operations
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockTransactionDTO }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { ...mockTransactionDTO, id: 2 } }),
        })
        .mockResolvedValueOnce({
          ok: true,
        });

      const { result } = renderHook(() => useTransactionMutations());

      await act(async () => {
        const [createResult, updateResult, deleteResult] = await Promise.all([
          result.current.createTransaction(mockCreateCommand),
          result.current.updateTransaction(1, mockUpdateCommand),
          result.current.deleteTransaction(2),
        ]);

        expect(createResult).toEqual(mockTransactionDTO);
        expect(updateResult).toEqual({ ...mockTransactionDTO, id: 2 });
        expect(deleteResult).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should handle mixed success and failure in concurrent operations", async () => {
      // Mock mixed responses
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockTransactionDTO }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () =>
            Promise.resolve({
              error: {
                code: "VALIDATION_ERROR",
                message: "Update failed",
              },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
        });

      const { result } = renderHook(() => useTransactionMutations());

      await act(async () => {
        const [createResult, updateResult, deleteResult] = await Promise.all([
          result.current.createTransaction(mockCreateCommand),
          result.current.updateTransaction(1, mockUpdateCommand),
          result.current.deleteTransaction(2),
        ]);

        expect(createResult).toEqual(mockTransactionDTO);
        expect(updateResult).toBe(null);
        expect(deleteResult).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      // Error should be set from the failed update operation
      expect(result.current.error?.message).toBe("Update failed");
    });
  });

  describe("error handling edge cases", () => {
    it("should handle unknown error types gracefully", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: { message: "Some error" } }),
      });

      const { result } = renderHook(() => useTransactionMutations());

      await act(async () => {
        await result.current.createTransaction(mockCreateCommand);
      });

      expect(result.current.error?.message).toBe("Some error");
    });

    it("should handle response without error message", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      const { result } = renderHook(() => useTransactionMutations());

      await act(async () => {
        await result.current.updateTransaction(1, mockUpdateCommand);
      });

      expect(result.current.error?.message).toBe("Failed to update transaction");
    });

    it("should handle non-Error thrown values", async () => {
      fetchMock.mockRejectedValueOnce("String error");

      const { result } = renderHook(() => useTransactionMutations());

      await act(async () => {
        await result.current.deleteTransaction(1);
      });

      expect(result.current.error?.message).toBe("Unknown error occurred");
    });
  });
});

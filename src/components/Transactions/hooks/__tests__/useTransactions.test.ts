import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTransactions } from "../useTransactions";
import type {
  GetTransactionsQuery,
  TransactionDTO,
  ApiCollectionResponse,
  PaginationDTO,
  ApiErrorResponse,
} from "../../../../types";

// Mock fetch globally
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("useTransactions", () => {
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

  const mockPagination: PaginationDTO = {
    page: 1,
    limit: 10,
    total_items: 25,
    total_pages: 3,
  };

  const mockApiResponse: ApiCollectionResponse<TransactionDTO> = {
    data: [mockTransactionDTO],
    pagination: mockPagination,
  };

  const defaultFilters: GetTransactionsQuery = {};

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial state", () => {
    it("should return correct initial state with default filters", () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      fetchMock.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useTransactions(defaultFilters));

      expect(result.current.data).toEqual([]);
      expect(result.current.pagination).toEqual({
        page: 1,
        limit: 10,
        total_items: 0,
        total_pages: 0,
      });
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.refreshData).toBe("function");
    });

    it("should initialize pagination from filters", () => {
      const filtersWithPagination: GetTransactionsQuery = {
        page: 2,
        limit: 20,
      };

      const { result } = renderHook(() => useTransactions(filtersWithPagination));

      expect(result.current.pagination).toEqual({
        page: 2,
        limit: 20,
        total_items: 0,
        total_pages: 0,
      });
    });
  });

  describe("data fetching", () => {
    it("should successfully fetch transactions with default filters", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });

      const { result } = renderHook(() => useTransactions(defaultFilters));

      // Wait for the effect to run
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/transactions?");
      expect(result.current.data).toEqual([mockTransactionDTO]);
      expect(result.current.pagination).toEqual(mockPagination);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should build query parameters correctly", async () => {
      const filters: GetTransactionsQuery = {
        date_from: "2024-01-01",
        date_to: "2024-01-31",
        account_id: 1,
        category_id: 2,
        search: "lunch",
        sort: "transaction_date:desc",
        page: 2,
        limit: 20,
        include_inactive: true,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });

      renderHook(() => useTransactions(filters));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const expectedUrl =
        "/api/transactions?date_from=2024-01-01&date_to=2024-01-31&account_id=1&category_id=2&search=lunch&sort=transaction_date%3Adesc&page=2&limit=20&include_inactive=true";

      expect(fetchMock).toHaveBeenCalledWith(expectedUrl);
    });

    it("should handle partial filters correctly", async () => {
      const filters: GetTransactionsQuery = {
        account_id: 1,
        page: 1,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });

      renderHook(() => useTransactions(filters));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/transactions?account_id=1&page=1");
    });

    it("should handle response without pagination", async () => {
      const responseWithoutPagination: ApiCollectionResponse<TransactionDTO> = {
        data: [mockTransactionDTO],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(responseWithoutPagination),
      });

      const { result } = renderHook(() => useTransactions(defaultFilters));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.data).toEqual([mockTransactionDTO]);
      expect(result.current.pagination).toEqual({
        page: 1,
        limit: 10,
        total_items: 0,
        total_pages: 0,
      });
    });
  });

  describe("loading states", () => {
    it("should set loading state during fetch", async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      fetchMock.mockReturnValueOnce(promise);

      const { result } = renderHook(() => useTransactions(defaultFilters));

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolvePromise({
          ok: true,
          json: () => Promise.resolve(mockApiResponse),
        });
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("error handling", () => {
    it("should handle network errors", async () => {
      const networkError = new Error("Network error");
      fetchMock.mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useTransactions(defaultFilters));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toEqual(networkError);
    });

    it("should handle API errors with error response", async () => {
      const mockErrorResponse: ApiErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid filters",
          details: [{ field: "date_from", message: "Invalid date format" }],
        },
      };

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve(mockErrorResponse),
      });

      const { result } = renderHook(() => useTransactions(defaultFilters));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error?.message).toBe("Error fetching transactions: 400");
    });

    it("should handle malformed JSON response", async () => {
      const jsonError = new Error("Invalid JSON");
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(jsonError),
      });

      const { result } = renderHook(() => useTransactions(defaultFilters));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(jsonError);
    });

    it("should handle unknown error types", async () => {
      fetchMock.mockRejectedValueOnce("String error");

      const { result } = renderHook(() => useTransactions(defaultFilters));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error?.message).toBe("Unknown error occurred");
    });
  });

  describe("refreshData function", () => {
    it("should allow manual refresh of data", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });

      const { result } = renderHook(() => useTransactions(defaultFilters));

      // Initial load
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.data).toEqual([mockTransactionDTO]);

      // Mock a different response for manual refresh
      const updatedTransaction = { ...mockTransactionDTO, amount: -60.0 };
      const updatedResponse: ApiCollectionResponse<TransactionDTO> = {
        data: [updatedTransaction],
        pagination: mockPagination,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedResponse),
      });

      // Manual refresh
      await act(async () => {
        await result.current.refreshData();
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(result.current.data).toEqual([updatedTransaction]);
    });

    it("should clear previous errors on successful refresh", async () => {
      // First fetch fails
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useTransactions(defaultFilters));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error?.message).toBe("Network error");

      // Second fetch succeeds
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });

      await act(async () => {
        await result.current.refreshData();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.data).toEqual([mockTransactionDTO]);
    });
  });

  describe("filter changes", () => {
    it("should refetch data when filters change", async () => {
      const initialFilters: GetTransactionsQuery = { account_id: 1 };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });

      const { rerender } = renderHook((filters) => useTransactions(filters), { initialProps: initialFilters });

      // Wait for initial fetch
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/transactions?account_id=1");

      // Change filters
      const newFilters: GetTransactionsQuery = { account_id: 2, category_id: 1 };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ...mockApiResponse,
            data: [{ ...mockTransactionDTO, account_id: 2 }],
          }),
      });

      rerender(newFilters);

      // Wait for second fetch
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/transactions?account_id=2&category_id=1");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});

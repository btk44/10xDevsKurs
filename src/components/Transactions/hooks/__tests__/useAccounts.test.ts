import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAccounts } from "../useAccounts";
import type { AccountDTO, ApiCollectionResponse } from "../../../../types";

// Mock fetch globally
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("useAccounts", () => {
  const mockAccountDTO: AccountDTO = {
    id: 1,
    user_id: "user-123",
    name: "Main Account",
    currency_id: 1,
    currency_code: "USD",
    currency_description: "US Dollar",
    tag: "main",
    balance: 1000.5,
    active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  const mockAccountsResponse: ApiCollectionResponse<AccountDTO> = {
    data: [mockAccountDTO],
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

      const { result } = renderHook(() => useAccounts());

      expect(result.current.data).toEqual([]);
      expect(result.current.isLoading).toBe(true); // Loading starts immediately
      expect(result.current.error).toBe(null);
      expect(typeof result.current.refreshData).toBe("function");
    });

    it("should return correct initial state with includeInactive=true and start loading", () => {
      // Mock fetch to prevent actual loading for this test
      fetchMock.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolve to prevent actual loading
          })
      );

      const { result } = renderHook(() => useAccounts(true));

      expect(result.current.data).toEqual([]);
      expect(result.current.isLoading).toBe(true); // Loading starts immediately
      expect(result.current.error).toBe(null);
      expect(typeof result.current.refreshData).toBe("function");
    });
  });

  describe("automatic data fetching", () => {
    it("should fetch accounts on mount with includeInactive=false by default", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAccountsResponse),
      });

      const { result } = renderHook(() => useAccounts());

      // Initial state
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toEqual([]);

      // Wait for fetch to complete
      await act(async () => {
        // The useEffect will trigger the fetch
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/accounts?include_inactive=false");
      expect(result.current.data).toEqual([mockAccountDTO]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it("should fetch accounts on mount with includeInactive=true", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAccountsResponse),
      });

      const { result: hookResult } = renderHook(() => useAccounts(true));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/accounts?include_inactive=true");
      expect(hookResult.current.data).toEqual([mockAccountDTO]);
      expect(hookResult.current.isLoading).toBe(false);
      expect(hookResult.current.error).toBe(null);
    });

    it("should refetch when includeInactive parameter changes", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAccountsResponse),
      });

      const { rerender } = renderHook(({ includeInactive }) => useAccounts(includeInactive), {
        initialProps: { includeInactive: false },
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/accounts?include_inactive=false");
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Change includeInactive to true
      rerender({ includeInactive: true });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/accounts?include_inactive=true");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("successful data fetching", () => {
    it("should successfully fetch and set accounts data", async () => {
      const mockResponse = {
        data: [mockAccountDTO, { ...mockAccountDTO, id: 2, name: "Savings Account" }],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useAccounts());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.data).toEqual([mockAccountDTO, { ...mockAccountDTO, id: 2, name: "Savings Account" }]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it("should handle empty accounts array", async () => {
      const mockResponse = {
        data: [],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useAccounts());

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

      const { result } = renderHook(() => useAccounts());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("Error fetching accounts: 500");
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network connection failed");
      fetchMock.mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useAccounts());

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

      const { result } = renderHook(() => useAccounts());

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

      const { result } = renderHook(() => useAccounts());

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

      const { result } = renderHook(() => useAccounts());

      // Should be loading immediately
      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise({
          ok: true,
          json: () => Promise.resolve(mockAccountsResponse),
        });
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("should clear loading state when fetch completes", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAccountsResponse),
      });

      const { result } = renderHook(() => useAccounts());

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("should clear loading state when fetch fails", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useAccounts());

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("refreshData function", () => {
    it("should allow manual refresh of data", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [mockAccountDTO] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [{ ...mockAccountDTO, name: "Updated Account" }] }),
        });

      const { result } = renderHook(() => useAccounts());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.data).toEqual([mockAccountDTO]);

      // Manual refresh
      await act(async () => {
        await result.current.refreshData();
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(result.current.data).toEqual([{ ...mockAccountDTO, name: "Updated Account" }]);
    });

    it("should set loading state during manual refresh", async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAccountsResponse),
        })
        .mockReturnValueOnce(promise);

      const { result } = renderHook(() => useAccounts());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.refreshData();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise({
          ok: true,
          json: () => Promise.resolve(mockAccountsResponse),
        });
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("should clear previous error on successful manual refresh", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Initial error")).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAccountsResponse),
      });

      const { result } = renderHook(() => useAccounts());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBeInstanceOf(Error);

      await act(async () => {
        await result.current.refreshData();
      });

      expect(result.current.error).toBe(null);
      expect(result.current.data).toEqual([mockAccountDTO]);
    });
  });

  describe("error state management", () => {
    it("should clear error state on successful manual refresh", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Initial error")).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAccountsResponse),
      });

      const { result } = renderHook(() => useAccounts());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("Initial error");

      // Manual refresh should clear the error
      await act(async () => {
        await result.current.refreshData();
      });

      expect(result.current.error).toBe(null);
      expect(result.current.data).toEqual([mockAccountDTO]);
    });

    it("should preserve data when error occurs", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAccountsResponse),
        })
        .mockRejectedValueOnce(new Error("Subsequent error"));

      const { result } = renderHook(() => useAccounts());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.data).toEqual([mockAccountDTO]);
      expect(result.current.error).toBe(null);

      await act(async () => {
        await result.current.refreshData();
      });

      // Data should be preserved on error
      expect(result.current.data).toEqual([mockAccountDTO]);
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });
});

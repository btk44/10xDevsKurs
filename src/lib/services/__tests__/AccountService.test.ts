import { describe, it, expect, vi, beforeEach } from "vitest";
import { AccountService } from "../AccountService";
import { createMockSupabaseClient } from "../../../../tests/mocks/supabase";
import type { CreateAccountCommand, UpdateAccountCommand, AccountDTO } from "../../../types";

describe("AccountService", () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let accountService: AccountService;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    accountService = new AccountService(mockSupabase as any);
  });

  describe("validateCurrency", () => {
    it("should return true when currency exists and is active", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1 },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      const result = await accountService.validateCurrency(1);

      expect(result).toBe(true);
    });

    it("should return false when currency doesn't exist", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "No rows found" },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      const result = await accountService.validateCurrency(1);

      expect(result).toBe(false);
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

      await expect(accountService.validateCurrency(1)).rejects.toThrow("Failed to validate currency: Database error");
    });
  });

  describe("createAccount", () => {
    const validCommand: CreateAccountCommand = {
      name: "Test Account",
      currency_id: 1,
      tag: "test",
    };

    it("should create account successfully", async () => {
      // Mock currency validation
      vi.spyOn(accountService, "validateCurrency").mockResolvedValue(true);

      // Mock insert operation
      const insertQueryBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            user_id: "user123",
            name: "Test Account",
            currency_id: 1,
            tag: "test",
            active: true,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
          error: null,
        }),
      };

      // Mock details query with currency join
      const detailsQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            user_id: "user123",
            name: "Test Account",
            currency_id: 1,
            tag: "test",
            active: true,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            currencies: {
              code: "USD",
              description: "US Dollar",
            },
          },
          error: null,
        }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "accounts") {
          // Return different builders for different calls
          return detailsQueryBuilder as any;
        }
        return {} as any;
      });

      // Mock the first call to be the insert
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return insertQueryBuilder as any;
        }
        return detailsQueryBuilder as any;
      });

      const result = await accountService.createAccount(validCommand, "user123");

      expect(result).toEqual({
        id: 1,
        user_id: "user123",
        name: "Test Account",
        currency_id: 1,
        currency_code: "USD",
        currency_description: "US Dollar",
        tag: "test",
        balance: 0, // New accounts start with 0 balance
        active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      });
    });

    it("should throw error when currency doesn't exist", async () => {
      vi.spyOn(accountService, "validateCurrency").mockResolvedValue(false);

      await expect(accountService.createAccount(validCommand, "user123")).rejects.toThrow("CURRENCY_NOT_FOUND");
    });

    it("should handle database errors during creation", async () => {
      vi.spyOn(accountService, "validateCurrency").mockResolvedValue(true);

      const mockQueryBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "500", message: "Database error" },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      await expect(accountService.createAccount(validCommand, "user123")).rejects.toThrow(
        "Failed to create account: Database error"
      );
    });

    it("should handle missing data after creation", async () => {
      vi.spyOn(accountService, "validateCurrency").mockResolvedValue(true);

      const insertQueryBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(insertQueryBuilder as any);

      await expect(accountService.createAccount(validCommand, "user123")).rejects.toThrow(
        "Failed to create account: No data returned"
      );
    });
  });

  describe("getAccountById", () => {
    it("should return account with balance when found", async () => {
      // Mock successful account retrieval using view approach
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            user_id: "user123",
            name: "Test Account",
            currency_id: 1,
            tag: "test",
            active: true,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            currencies: {
              code: "USD",
              description: "US Dollar",
            },
          },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      const result = await accountService.getAccountById(1, "user123");

      // Since view approach doesn't calculate balance, it should be 0
      expect(result).toEqual({
        id: 1,
        user_id: "user123",
        name: "Test Account",
        currency_id: 1,
        currency_code: "USD",
        currency_description: "US Dollar",
        tag: "test",
        balance: 0, // View approach doesn't calculate balance
        active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      });
    });

    it("should return null when account not found", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "No rows found" },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      const result = await accountService.getAccountById(1, "user123");

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

      await expect(accountService.getAccountById(1, "user123")).rejects.toThrow(
        "Failed to retrieve account: Database error"
      );
    });
  });

  describe("getAccountsByUserId", () => {
    it("should retrieve accounts using function approach with balance calculation", async () => {
      // Force fallback to function approach by making view fail
      const mockViewQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockRejectedValue(new Error("View not available")),
      };

      const mockAccounts = [
        {
          id: 1,
          user_id: "user123",
          name: "Account 1",
          currency_id: 1,
          tag: "test",
          active: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          currencies: {
            code: "USD",
            description: "US Dollar",
          },
        },
      ];

      const mockFunctionQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockAccounts,
          error: null,
        }),
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? (mockViewQueryBuilder as any) : (mockFunctionQueryBuilder as any);
      });

      mockSupabase.rpc.mockResolvedValue({ data: 150.75, error: null });

      const result = await accountService.getAccountsByUserId("user123");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        user_id: "user123",
        name: "Account 1",
        currency_id: 1,
        currency_code: "USD",
        currency_description: "US Dollar",
        tag: "test",
        balance: 150.75, // Function approach calculates balance
        active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      });
    });

    it("should include inactive accounts when requested", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      await accountService.getAccountsByUserId("user123", true);

      // Should not filter by active status
      expect(mockQueryBuilder.eq).toHaveBeenCalledTimes(1); // Only user_id filter
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("user_id", "user123");
    });

    it("should fall back to function approach when view fails", async () => {
      // Mock view approach to fail
      const failingViewQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockRejectedValue(new Error("View not available")),
      };

      // Mock function approach to succeed - no accounts found
      const functionQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? (failingViewQueryBuilder as any) : (functionQueryBuilder as any);
      });

      const result = await accountService.getAccountsByUserId("user123");

      expect(result).toEqual([]);
    });
  });

  describe("updateAccount", () => {
    const validUpdateCommand: UpdateAccountCommand = {
      name: "Updated Account",
      tag: "updated",
    };

    it("should update account successfully", async () => {
      // Mock currency validation when currency changes
      vi.spyOn(accountService, "validateCurrency").mockResolvedValue(true);

      // Mock update operation
      const mockUpdateQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            user_id: "user123",
            name: "Updated Account",
            currency_id: 1,
            tag: "updated",
            active: true,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-02T00:00:00Z",
          },
          error: null,
        }),
      };

      // Mock getAccountById to return updated account with balance
      const mockGetQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            user_id: "user123",
            name: "Updated Account",
            currency_id: 1,
            tag: "updated",
            active: true,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-02T00:00:00Z",
            currencies: {
              code: "USD",
              description: "US Dollar",
            },
          },
          error: null,
        }),
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        // First call is update, second is getAccountById
        return callCount === 1 ? (mockUpdateQueryBuilder as any) : (mockGetQueryBuilder as any);
      });

      mockSupabase.rpc.mockResolvedValue(100.5);

      const result = await accountService.updateAccount(1, validUpdateCommand, "user123");

      expect(result.name).toBe("Updated Account");
      expect(result.tag).toBe("updated");
      expect(result.balance).toBe(0); // getAccountById uses view approach which doesn't calculate balance
    });

    it("should validate currency when currency_id changes", async () => {
      vi.spyOn(accountService, "getAccountById").mockResolvedValue({
        id: 1,
        user_id: "user123",
        name: "Test Account",
        currency_id: 1,
        currency_code: "USD",
        currency_description: "US Dollar",
        tag: "test",
        balance: 100.5,
        active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      } as AccountDTO);

      vi.spyOn(accountService, "validateCurrency").mockResolvedValue(false);

      await expect(accountService.updateAccount(1, { currency_id: 2 }, "user123")).rejects.toThrow(
        "CURRENCY_NOT_FOUND"
      );
    });

    it("should throw error when account not found", async () => {
      vi.spyOn(accountService, "getAccountById").mockResolvedValue(null);

      await expect(accountService.updateAccount(1, validUpdateCommand, "user123")).rejects.toThrow(
        "Account not found or access denied"
      );
    });

    it("should handle unique constraint violations", async () => {
      vi.spyOn(accountService, "getAccountById").mockResolvedValue({
        id: 1,
        user_id: "user123",
        name: "Test Account",
        currency_id: 1,
        currency_code: "USD",
        currency_description: "US Dollar",
        tag: "test",
        balance: 100.5,
        active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      } as AccountDTO);

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "23505", message: "Duplicate key value" },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      await expect(accountService.updateAccount(1, validUpdateCommand, "user123")).rejects.toThrow(
        "Failed to update account: Duplicate key value"
      );
    });
  });
});

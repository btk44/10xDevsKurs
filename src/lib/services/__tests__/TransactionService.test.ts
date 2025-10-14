import { describe, it, expect, vi, beforeEach } from "vitest";
import { TransactionService } from "../TransactionService";
import { createMockSupabaseClient } from "../../../../tests/mocks/supabase";
import type { UpdateTransactionCommand, GetTransactionsQuery, TransactionDTO } from "../../../types";

describe("TransactionService", () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let transactionService: TransactionService;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    transactionService = new TransactionService(mockSupabase as any);
  });

  describe("validateAccountOwnership", () => {
    it("should return true when account exists and belongs to user", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1 },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      const result = await transactionService.validateAccountOwnership(1, "user123");

      expect(result).toBe(true);
    });

    it("should return false when account doesn't exist", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "No rows found" },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      const result = await transactionService.validateAccountOwnership(1, "user123");

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

      await expect(transactionService.validateAccountOwnership(1, "user123")).rejects.toThrow(
        "Failed to validate account ownership: Database error"
      );
    });
  });

  describe("validateCategoryOwnership", () => {
    it("should return true when category exists and belongs to user", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1 },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      const result = await transactionService.validateCategoryOwnership(1, "user123");

      expect(result).toBe(true);
    });

    it("should return false when category doesn't exist", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "No rows found" },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      const result = await transactionService.validateCategoryOwnership(1, "user123");

      expect(result).toBe(false);
    });
  });

  describe("getTransactionById", () => {
    it("should return transaction when found", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            user_id: "user123",
            transaction_date: "2024-06-15T00:00:00Z",
            account_id: 1,
            category_id: 1,
            amount: 100.5,
            currency_id: 1,
            comment: "Test transaction",
            active: true,
            created_at: "2024-06-15T12:00:00Z",
            updated_at: "2024-06-15T12:00:00Z",
            accounts: { name: "Test Account" },
            categories: { name: "Test Category", category_type: "expense" },
            currencies: { code: "USD" },
          },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      const result = await transactionService.getTransactionById(1, "user123");

      expect(result).toEqual({
        id: 1,
        user_id: "user123",
        transaction_date: "2024-06-15T00:00:00Z",
        account_id: 1,
        category_id: 1,
        amount: 100.5,
        currency_id: 1,
        comment: "Test transaction",
        active: true,
        created_at: "2024-06-15T12:00:00Z",
        updated_at: "2024-06-15T12:00:00Z",
        account_name: "Test Account",
        category_name: "Test Category",
        category_type: "expense",
        currency_code: "USD",
      });
    });

    it("should return null when transaction not found", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "No rows found" },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      const result = await transactionService.getTransactionById(1, "user123");

      expect(result).toBeNull();
    });
  });

  describe("updateTransaction", () => {
    const validUpdateCommand: UpdateTransactionCommand = {
      amount: 150.0,
      comment: "Updated transaction",
    };

    it("should update transaction successfully", async () => {
      // Mock getTransactionById
      vi.spyOn(transactionService, "getTransactionById").mockResolvedValue({
        id: 1,
        user_id: "user123",
        transaction_date: "2024-06-15T00:00:00Z",
        account_id: 1,
        category_id: 1,
        amount: 100.5,
        currency_id: 1,
        comment: "Original transaction",
        active: true,
        created_at: "2024-06-15T12:00:00Z",
        updated_at: "2024-06-15T12:00:00Z",
        account_name: "Test Account",
        category_name: "Test Category",
        category_type: "expense",
        currency_code: "USD",
      } as TransactionDTO);

      // Mock validation for changed fields
      vi.spyOn(transactionService, "validateAccountOwnership").mockResolvedValue(true);
      vi.spyOn(transactionService, "validateCategoryOwnership").mockResolvedValue(true);

      // Mock update operation
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            user_id: "user123",
            transaction_date: "2024-06-15T00:00:00Z",
            account_id: 1,
            category_id: 1,
            amount: 150.0,
            currency_id: 1,
            comment: "Updated transaction",
            active: true,
            created_at: "2024-06-15T12:00:00Z",
            updated_at: "2024-06-15T13:00:00Z",
            account_name: "Test Account",
            category_name: "Test Category",
            category_type: "expense",
            currency_code: "USD",
          },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      const result = await transactionService.updateTransaction(validUpdateCommand, 1, "user123");

      expect(result.amount).toBe(150.0);
      expect(result.comment).toBe("Updated transaction");
    });

    it("should validate account ownership when account_id changes", async () => {
      // Mock transaction existence check
      const existenceQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, user_id: "user123" },
          error: null,
        }),
      };

      // Mock update operation
      const updateQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? (existenceQueryBuilder as any) : (updateQueryBuilder as any);
      });

      vi.spyOn(transactionService, "validateAccountOwnership").mockResolvedValue(false);

      await expect(transactionService.updateTransaction({ account_id: 2 }, 1, "user123")).rejects.toThrow(
        "Account not found or not accessible"
      );
    });

    it("should validate category ownership when category_id changes", async () => {
      // Mock transaction existence check
      const existenceQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, user_id: "user123" },
          error: null,
        }),
      };

      // Mock update operation
      const updateQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? (existenceQueryBuilder as any) : (updateQueryBuilder as any);
      });

      vi.spyOn(transactionService, "validateAccountOwnership").mockResolvedValue(true);
      vi.spyOn(transactionService, "validateCategoryOwnership").mockResolvedValue(false);

      await expect(transactionService.updateTransaction({ category_id: 2 }, 1, "user123")).rejects.toThrow(
        "Category not found or not accessible"
      );
    });

    it("should throw error when transaction not found", async () => {
      vi.spyOn(transactionService, "getTransactionById").mockResolvedValue(null);

      await expect(transactionService.updateTransaction(validUpdateCommand, 1, "user123")).rejects.toThrow(
        "Transaction not found or access denied"
      );
    });
  });

  describe("getTransactions", () => {
    it("should retrieve transactions with pagination", async () => {
      const query: GetTransactionsQuery = {
        page: 1,
        limit: 10,
        sort: "transaction_date:desc",
      };

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [
            {
              id: 1,
              user_id: "user123",
              transaction_date: "2024-06-15T00:00:00Z",
              account_id: 1,
              category_id: 1,
              amount: 100.5,
              currency_id: 1,
              comment: "Test transaction",
              active: true,
              created_at: "2024-06-15T12:00:00Z",
              updated_at: "2024-06-15T12:00:00Z",
              accounts: { name: "Test Account" },
              categories: { name: "Test Category", category_type: "expense" },
              currencies: { code: "USD" },
            },
          ],
          count: 1,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      const result = await transactionService.getTransactions(query, "user123");

      expect(result.data).toHaveLength(1);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total_items: 1,
        total_pages: 1,
      });
      expect(result.data[0]).toEqual({
        id: 1,
        user_id: "user123",
        transaction_date: "2024-06-15T00:00:00Z",
        account_id: 1,
        category_id: 1,
        amount: 100.5,
        currency_id: 1,
        comment: "Test transaction",
        active: true,
        created_at: "2024-06-15T12:00:00Z",
        updated_at: "2024-06-15T12:00:00Z",
        account_name: "Test Account",
        category_name: "Test Category",
        category_type: "expense",
        currency_code: "USD",
      });
    });

    it("should apply date filters", async () => {
      const query: GetTransactionsQuery = {
        date_from: "2024-01-01",
        date_to: "2024-12-31",
      };

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          count: 0,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      await transactionService.getTransactions(query, "user123");

      expect(mockQueryBuilder.gte).toHaveBeenCalledWith("transaction_date", "2024-01-01T00:00:00.000Z");
      expect(mockQueryBuilder.lte).toHaveBeenCalledWith("transaction_date", "2024-12-31T23:59:59.999Z");
    });

    it("should apply search filter", async () => {
      const query: GetTransactionsQuery = {
        search: "test search",
      };

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          count: 0,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      await transactionService.getTransactions(query, "user123");

      expect(mockQueryBuilder.ilike).toHaveBeenCalledWith("comment", "%test search%");
    });

    it("should handle sorting correctly", async () => {
      const query: GetTransactionsQuery = {
        sort: "amount:desc",
      };

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          count: 0,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      await transactionService.getTransactions(query, "user123");

      expect(mockQueryBuilder.order).toHaveBeenCalledWith("amount", { ascending: false });
      expect(mockQueryBuilder.order).toHaveBeenCalledWith("id", { ascending: true });
    });
  });
});

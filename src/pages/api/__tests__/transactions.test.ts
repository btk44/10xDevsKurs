import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../transactions";
import {
  createMockAuthenticatedContext,
  createMockUnauthenticatedContext,
  createMockRequestWithQuery,
  createMockJSONRequest,
  parseResponse,
} from "../../../../tests/mocks/api";
import type { GetTransactionsQuery, CreateTransactionCommand } from "../../../types";

// Mock the TransactionService
vi.mock("../../../lib/services/TransactionService", () => ({
  TransactionService: vi.fn(),
}));

// Mock the validation schemas
vi.mock("../../../lib/validation/schemas", () => ({
  GetTransactionsQuerySchema: {
    safeParse: vi.fn<
      () => {
        success: boolean;
        data?: GetTransactionsQuery;
        error?: { issues: { message: string }[] };
      }
    >(),
  },
  CreateTransactionCommandSchema: {
    safeParse: vi.fn<
      () => {
        success: boolean;
        data?: CreateTransactionCommand;
        error?: { issues: { message: string }[] };
      }
    >(),
  },
}));

// Mock the validation utils
vi.mock("../../../lib/validation/utils", () => ({
  formatZodErrors: vi.fn<(errors: { message: string }[]) => { field: string; message: string }[]>(),
}));

import { TransactionService } from "../../../lib/services/TransactionService";
import { GetTransactionsQuerySchema, CreateTransactionCommandSchema } from "../../../lib/validation/schemas";
import { formatZodErrors } from "../../../lib/validation/utils";

const GetTransactionsQuerySchemaMock = GetTransactionsQuerySchema as unknown as {
  safeParse: ReturnType<typeof vi.fn>;
};
const CreateTransactionCommandSchemaMock = CreateTransactionCommandSchema as unknown as {
  safeParse: ReturnType<typeof vi.fn>;
};
const formatZodErrorsMock = formatZodErrors as unknown as ReturnType<typeof vi.fn>;

describe("GET /api/transactions", () => {
  let mockTransactionService: {
    getTransactions: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransactionService = {
      getTransactions: vi.fn(),
      create: vi.fn(),
    };
    (TransactionService as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockTransactionService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Request Validation & Input Handling", () => {
    it("validates query parameters successfully", async () => {
      const validQuery = {
        page: 1,
        limit: 10,
        date_from: "2024-01-01",
        date_to: "2024-12-31",
      };

      const mockValidationResult = {
        success: true,
        data: validQuery,
      };

      GetTransactionsQuerySchemaMock.safeParse.mockReturnValue(mockValidationResult);

      mockTransactionService.getTransactions.mockResolvedValue({
        data: [],
        pagination: { total_items: 0, total_pages: 0, current_page: 1, per_page: 10 },
      });

      const context = createMockAuthenticatedContext();
      context.request = createMockRequestWithQuery("/api/transactions", {
        page: "1",
        limit: "10",
        date_from: "2024-01-01",
        date_to: "2024-12-31",
      });

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(GetTransactionsQuerySchema.safeParse).toHaveBeenCalledWith({
        page: "1",
        limit: "10",
        date_from: "2024-01-01",
        date_to: "2024-12-31",
      });
      expect(response.status).toBe(200);
      expect(result.body).toMatchInlineSnapshot(`
        {
          "data": [],
          "pagination": {
            "current_page": 1,
            "per_page": 10,
            "total_items": 0,
            "total_pages": 0,
          },
        }
      `);
    });

    it("rejects invalid pagination parameters", async () => {
      const mockValidationResult = {
        success: false,
        error: { issues: [{ message: "Invalid page number" }] },
      };

      GetTransactionsQuerySchemaMock.safeParse.mockReturnValue(mockValidationResult);
      formatZodErrorsMock.mockReturnValue([{ field: "page", message: "Page must be a positive integer" }]);

      const context = createMockAuthenticatedContext();
      context.request = createMockRequestWithQuery("/api/transactions", {
        page: "invalid",
        limit: "10",
      });

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(result.body).toMatchInlineSnapshot(`
        {
          "error": {
            "code": "INVALID_PARAMETERS",
            "details": [
              {
                "field": "page",
                "message": "Page must be a positive integer",
              },
            ],
            "message": "Invalid query parameters",
          },
        }
      `);
    });

    it("validates date range constraints", async () => {
      const mockValidationResult = {
        success: true,
        data: {
          date_from: "2024-12-31",
          date_to: "2024-01-01",
        },
      };

      GetTransactionsQuerySchemaMock.safeParse.mockReturnValue(mockValidationResult);

      const context = createMockAuthenticatedContext();
      context.request = createMockRequestWithQuery("/api/transactions", {
        date_from: "2024-12-31",
        date_to: "2024-01-01",
      });

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(result.body.error.code).toBe("INVALID_DATE_RANGE");
      expect(result.body.error.message).toBe("Date from cannot be later than date to");
    });

    it("prevents excessively large date ranges", async () => {
      const mockValidationResult = {
        success: true,
        data: {
          date_from: "2020-01-01",
          date_to: "2030-01-01", // More than 10 years
        },
      };

      GetTransactionsQuerySchemaMock.safeParse.mockReturnValue(mockValidationResult);

      const context = createMockAuthenticatedContext();
      context.request = createMockRequestWithQuery("/api/transactions", {
        date_from: "2020-01-01",
        date_to: "2030-01-01",
      });

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(result.body.error.code).toBe("DATE_RANGE_TOO_LARGE");
      expect(result.body.error.message).toBe("Date range cannot exceed 10 years");
    });

    it("validates search term length limits", async () => {
      const longSearchTerm = "a".repeat(101); // 101 characters, exceeds limit
      const mockValidationResult = {
        success: true,
        data: { search: longSearchTerm },
      };

      GetTransactionsQuerySchemaMock.safeParse.mockReturnValue(mockValidationResult);

      const context = createMockAuthenticatedContext();
      context.request = createMockRequestWithQuery("/api/transactions", {
        search: longSearchTerm,
      });

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(result.body.error.code).toBe("SEARCH_TERM_TOO_LONG");
      expect(result.body.error.message).toBe("Search term cannot exceed 100 characters");
    });

    it("prevents unreasonable pagination requests", async () => {
      const mockValidationResult = {
        success: true,
        data: { page: 10001 }, // Exceeds max page limit
      };

      GetTransactionsQuerySchemaMock.safeParse.mockReturnValue(mockValidationResult);

      const context = createMockAuthenticatedContext();
      context.request = createMockRequestWithQuery("/api/transactions", {
        page: "10001",
      });

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(result.body.error.code).toBe("PAGINATION_LIMIT_EXCEEDED");
      expect(result.body.error.message).toBe("Page number too high. Maximum allowed page is 10000");
    });

    it("validates payload size limits for POST requests", async () => {
      const largePayload = { data: "x".repeat(10001) }; // 10KB+ payload

      const context = createMockAuthenticatedContext();
      context.request = createMockJSONRequest(largePayload);

      // Mock headers.get to return large content-length
      context.request.headers.set("content-length", "10001");

      const response = await POST(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(413);
      expect(result.body.error.code).toBe("PAYLOAD_TOO_LARGE");
      expect(result.body.error.message).toBe("Request payload exceeds maximum allowed size");
    });

    it("handles malformed JSON in POST requests", async () => {
      const context = createMockAuthenticatedContext();
      context.request = new Request("http://localhost:4321/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ invalid json",
      });

      const response = await POST(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(result.body.error.code).toBe("INVALID_JSON");
      expect(result.body.error.message).toBe("Request body must be valid JSON");
    });

    it("validates request body structure for POST requests", async () => {
      const invalidBody = "string instead of object";

      const context = createMockAuthenticatedContext();
      context.request = createMockJSONRequest(invalidBody);

      const response = await POST(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(result.body.error.code).toBe("INVALID_REQUEST_STRUCTURE");
      expect(result.body.error.message).toBe("Request body must be a valid object");
    });

    it("validates transaction creation command schema", async () => {
      const invalidCommand = { invalidField: "value" };
      const mockValidationResult = {
        success: false,
        error: { issues: [{ message: "Invalid amount" }] },
      };

      CreateTransactionCommandSchemaMock.safeParse.mockReturnValue(mockValidationResult);
      formatZodErrorsMock.mockReturnValue([{ field: "amount", message: "Amount must be a positive number" }]);

      const context = createMockAuthenticatedContext();
      context.request = createMockJSONRequest(invalidCommand);

      const response = await POST(context);
      const result = await parseResponse(response);

      expect(CreateTransactionCommandSchema.safeParse).toHaveBeenCalledWith(invalidCommand);
      expect(response.status).toBe(400);
      expect(result.body.error.code).toBe("VALIDATION_ERROR");
      expect(result.body.error.message).toBe("Validation failed");
    });
  });

  describe("Authentication & Authorization Logic", () => {
    it("returns 401 when user is not authenticated for GET requests", async () => {
      const context = createMockUnauthenticatedContext();

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(401);
      expect(result.body).toMatchInlineSnapshot(`
        {
          "error": {
            "code": "UNAUTHENTICATED",
            "message": "Authentication required",
          },
        }
      `);
    });

    it("returns 401 when user is not authenticated for POST requests", async () => {
      const context = createMockUnauthenticatedContext();

      const response = await POST(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(401);
      expect(result.body).toMatchInlineSnapshot(`
        {
          "error": {
            "code": "UNAUTHENTICATED",
            "message": "Authentication required",
          },
        }
      `);
    });

    it("passes authenticated user context to service layer", async () => {
      const userId = "authenticated-user-123";
      const mockValidationResult = {
        success: true,
        data: { page: 1, limit: 10 },
      };

      GetTransactionsQuerySchemaMock.safeParse.mockReturnValue(mockValidationResult);

      mockTransactionService.getTransactions.mockResolvedValue({
        data: [],
        pagination: { total_items: 0, total_pages: 0, current_page: 1, per_page: 10 },
      });

      const context = createMockAuthenticatedContext(userId);

      await GET(context);

      expect(mockTransactionService.getTransactions).toHaveBeenCalledWith({ page: 1, limit: 10 }, userId);
    });

    it("validates supabase client availability", async () => {
      const mockValidationResult = {
        success: true,
        data: { page: 1, limit: 10 },
      };

      GetTransactionsQuerySchemaMock.safeParse.mockReturnValue(mockValidationResult);

      const context = createMockAuthenticatedContext();
      context.locals.supabase = null;

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(503);
      expect(result.body.error.code).toBe("SERVICE_UNAVAILABLE");
      expect(result.body.error.message).toBe("Database connection not available");
    });
  });

  describe("Error Handling & Response Formatting", () => {
    it("maps service errors to appropriate API errors", async () => {
      const mockValidationResult = {
        success: true,
        data: { page: 1, limit: 10 },
      };

      GetTransactionsQuerySchemaMock.safeParse.mockReturnValue(mockValidationResult);

      // Mock service to throw a "not found" error
      mockTransactionService.getTransactions.mockRejectedValue(new Error("Transaction not found or access denied"));

      const context = createMockAuthenticatedContext();

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(404); // Should return 404 for security
      expect(result.body.error.code).toBe("TRANSACTION_NOT_FOUND");
      expect(result.body.error.message).toBe("Transaction not found");
    });

    it("handles database schema errors", async () => {
      const mockValidationResult = {
        success: true,
        data: { page: 1, limit: 10 },
      };

      GetTransactionsQuerySchemaMock.safeParse.mockReturnValue(mockValidationResult);

      mockTransactionService.getTransactions.mockRejectedValue(new Error("Database schema error"));

      const context = createMockAuthenticatedContext();

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(500);
      expect(result.body.error.code).toBe("DATABASE_SCHEMA_ERROR");
      expect(result.body.error.message).toBe("Database configuration error");
    });

    it("handles access denied errors", async () => {
      const mockValidationResult = {
        success: true,
        data: { page: 1, limit: 10 },
      };

      GetTransactionsQuerySchemaMock.safeParse.mockReturnValue(mockValidationResult);

      mockTransactionService.getTransactions.mockRejectedValue(new Error("Access denied: insufficient permissions"));

      const context = createMockAuthenticatedContext();

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(403);
      expect(result.body.error.code).toBe("ACCESS_DENIED");
      expect(result.body.error.message).toBe("Access denied: insufficient permissions");
    });

    it("handles database operation failures", async () => {
      const mockValidationResult = {
        success: true,
        data: { page: 1, limit: 10 },
      };

      GetTransactionsQuerySchemaMock.safeParse.mockReturnValue(mockValidationResult);

      mockTransactionService.getTransactions.mockRejectedValue(new Error("Failed to fetch transactions"));

      const context = createMockAuthenticatedContext();

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(500);
      expect(result.body.error.code).toBe("DATABASE_ERROR");
      expect(result.body.error.message).toBe("Database operation failed");
    });

    it("handles unexpected errors gracefully", async () => {
      const mockValidationResult = {
        success: true,
        data: { page: 1, limit: 10 },
      };

      GetTransactionsQuerySchemaMock.safeParse.mockReturnValue(mockValidationResult);

      mockTransactionService.getTransactions.mockRejectedValue(new Error("Unexpected error message"));

      const context = createMockAuthenticatedContext();

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(500);
      expect(result.body.error.code).toBe("INTERNAL_ERROR");
      expect(result.body.error.message).toBe("An unexpected error occurred");
    });

    it("includes security headers in error responses", async () => {
      const context = createMockUnauthenticatedContext();

      const response = await GET(context);

      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
      expect(response.headers.get("Cache-Control")).toBe("no-cache, no-store, must-revalidate");
      // Note: X-Response-Time is not included in createResponse for auth errors
    });

    it("includes performance headers in successful responses", async () => {
      const mockValidationResult = {
        success: true,
        data: { page: 1, limit: 10 },
      };

      GetTransactionsQuerySchemaMock.safeParse.mockReturnValue(mockValidationResult);

      mockTransactionService.getTransactions.mockResolvedValue({
        data: [],
        pagination: { total_items: 0, total_pages: 0, current_page: 1, per_page: 10 },
      });

      const context = createMockAuthenticatedContext();

      const response = await GET(context);

      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(response.headers.get("X-Response-Time")).toMatch(/^\d+ms$/);
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
      expect(response.headers.get("Cache-Control")).toBe("no-cache, no-store, must-revalidate");
    });

    it("adds performance warning for slow queries", async () => {
      const mockValidationResult = {
        success: true,
        data: { page: 1, limit: 10 },
      };

      GetTransactionsQuerySchemaMock.safeParse.mockReturnValue(mockValidationResult);

      // Mock a slow service call
      mockTransactionService.getTransactions.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: [],
                  pagination: { total_items: 0, total_pages: 0, current_page: 1, per_page: 10 },
                }),
              2100
            )
          ) // 2.1 seconds - exceeds 2 second threshold
      );

      const context = createMockAuthenticatedContext();

      const response = await GET(context);

      expect(response.headers.get("X-Performance-Warning")).toBe("Query execution time exceeded 2 seconds");
    });

    it("handles invalid page numbers when data exists", async () => {
      const mockValidationResult = {
        success: true,
        data: { page: 5, limit: 10 }, // Requesting page 5
      };

      GetTransactionsQuerySchemaMock.safeParse.mockReturnValue(mockValidationResult);

      mockTransactionService.getTransactions.mockResolvedValue({
        data: [], // No results on this page
        pagination: {
          total_items: 100, // But there are total items
          total_pages: 10, // Max page is 10
          current_page: 5,
          per_page: 10,
        },
      });

      const context = createMockAuthenticatedContext();

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(404);
      expect(result.body.error.code).toBe("PAGE_NOT_FOUND");
      expect(result.body.error.message).toMatch(/Requested page 5 does not exist/);
    });
  });

  describe("Business Logic Integration", () => {
    it("successfully retrieves transactions and returns formatted response", async () => {
      const mockTransactions = [
        {
          id: 1,
          amount: 100,
          description: "Test transaction",
          account_id: 1,
          category_id: 1,
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      const mockPagination = {
        total_items: 1,
        total_pages: 1,
        current_page: 1,
        per_page: 10,
      };

      const mockValidationResult = {
        success: true,
        data: { page: 1, limit: 10 },
      };

      GetTransactionsQuerySchemaMock.safeParse.mockReturnValue(mockValidationResult);

      mockTransactionService.getTransactions.mockResolvedValue({
        data: mockTransactions,
        pagination: mockPagination,
      });

      const context = createMockAuthenticatedContext();

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(mockTransactionService.getTransactions).toHaveBeenCalledWith({ page: 1, limit: 10 }, "test-user-id");
      expect(response.status).toBe(200);
      expect(result.body).toMatchInlineSnapshot(`
        {
          "data": [
            {
              "account_id": 1,
              "amount": 100,
              "category_id": 1,
              "created_at": "2024-01-01T00:00:00Z",
              "description": "Test transaction",
              "id": 1,
            },
          ],
          "pagination": {
            "current_page": 1,
            "per_page": 10,
            "total_items": 1,
            "total_pages": 1,
          },
        }
      `);
    });

    it("successfully creates transaction and returns created resource", async () => {
      const createCommand = {
        account_id: 1,
        category_id: 1,
        amount: 50.0,
        description: "New transaction",
        transaction_date: "2024-01-15",
      };

      const createdTransaction = {
        id: 123,
        ...createCommand,
        created_at: "2024-01-15T10:00:00Z",
        updated_at: "2024-01-15T10:00:00Z",
      };

      const mockValidationResult = {
        success: true,
        data: createCommand,
      };

      CreateTransactionCommandSchemaMock.safeParse.mockReturnValue(mockValidationResult);

      mockTransactionService.create.mockResolvedValue(createdTransaction);

      const context = createMockAuthenticatedContext();
      context.request = createMockJSONRequest(createCommand);

      const response = await POST(context);
      const result = await parseResponse(response);

      expect(mockTransactionService.create).toHaveBeenCalledWith(createCommand, "test-user-id");
      expect(response.status).toBe(201);
      expect(result.body).toMatchInlineSnapshot(`
        {
          "data": {
            "account_id": 1,
            "amount": 50,
            "category_id": 1,
            "created_at": "2024-01-15T10:00:00Z",
            "description": "New transaction",
            "id": 123,
            "transaction_date": "2024-01-15",
            "updated_at": "2024-01-15T10:00:00Z",
          },
        }
      `);
    });

    it("handles empty transaction list correctly", async () => {
      const mockValidationResult = {
        success: true,
        data: { page: 1, limit: 10 },
      };

      GetTransactionsQuerySchemaMock.safeParse.mockReturnValue(mockValidationResult);

      mockTransactionService.getTransactions.mockResolvedValue({
        data: [],
        pagination: {
          total_items: 0,
          total_pages: 0,
          current_page: 1,
          per_page: 10,
        },
      });

      const context = createMockAuthenticatedContext();

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(result.body.data).toEqual([]);
      expect(result.body.pagination.total_items).toBe(0);
    });

    it("passes complex query parameters to service layer", async () => {
      const complexQuery = {
        page: 2,
        limit: 25,
        date_from: "2024-01-01",
        date_to: "2024-12-31",
        account_id: 5,
        category_id: 10,
        search: "coffee shop",
      };

      const mockValidationResult = {
        success: true,
        data: complexQuery,
      };

      GetTransactionsQuerySchemaMock.safeParse.mockReturnValue(mockValidationResult);

      mockTransactionService.getTransactions.mockResolvedValue({
        data: [],
        pagination: { total_items: 0, total_pages: 0, current_page: 2, per_page: 25 },
      });

      const context = createMockAuthenticatedContext();
      context.request = createMockRequestWithQuery("/api/transactions", {
        page: "2",
        limit: "25",
        date_from: "2024-01-01",
        date_to: "2024-12-31",
        account_id: "5",
        category_id: "10",
        search: "coffee shop",
      });

      await GET(context);

      expect(mockTransactionService.getTransactions).toHaveBeenCalledWith(complexQuery, "test-user-id");
    });

    it("transforms service errors into API responses for GET requests", async () => {
      const mockValidationResult = {
        success: true,
        data: { page: 1, limit: 10 },
      };

      GetTransactionsQuerySchemaMock.safeParse.mockReturnValue(mockValidationResult);

      mockTransactionService.getTransactions.mockRejectedValue(new Error("Database connection failed"));

      const context = createMockAuthenticatedContext();

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(500);
      expect(result.body.error.code).toBe("DATABASE_ERROR");
      expect(result.body.error.message).toBe("Database operation failed");
    });

    it("transforms service errors into API responses for POST requests", async () => {
      const createCommand = {
        account_id: 999, // Non-existent account
        category_id: 1,
        amount: 100,
        description: "Invalid transaction",
      };

      const mockValidationResult = {
        success: true,
        data: createCommand,
      };

      CreateTransactionCommandSchemaMock.safeParse.mockReturnValue(mockValidationResult);

      mockTransactionService.create.mockRejectedValue(new Error("Account not found or not accessible"));

      const context = createMockAuthenticatedContext();
      context.request = createMockJSONRequest(createCommand);

      const response = await POST(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(result.body.error.code).toBe("RESOURCE_NOT_FOUND");
    });

    it("initializes TransactionService with correct supabase client", async () => {
      const mockValidationResult = {
        success: true,
        data: { page: 1, limit: 10 },
      };

      GetTransactionsQuerySchemaMock.safeParse.mockReturnValue(mockValidationResult);

      mockTransactionService.getTransactions.mockResolvedValue({
        data: [],
        pagination: { total_items: 0, total_pages: 0, current_page: 1, per_page: 10 },
      });

      const context = createMockAuthenticatedContext();

      await GET(context);

      expect(TransactionService).toHaveBeenCalledWith(context.locals.supabase);
    });

    it("handles service response transformation correctly", async () => {
      const serviceResponse = {
        data: [
          {
            id: 1,
            amount: 150.5,
            description: "Service response",
            account_id: 2,
            category_id: 3,
            transaction_date: "2024-01-20",
            created_at: "2024-01-20T12:00:00Z",
          },
        ],
        pagination: {
          total_items: 100,
          total_pages: 10,
          current_page: 1,
          per_page: 10,
        },
      };

      const mockValidationResult = {
        success: true,
        data: { page: 1, limit: 10 },
      };

      GetTransactionsQuerySchemaMock.safeParse.mockReturnValue(mockValidationResult);

      mockTransactionService.getTransactions.mockResolvedValue(serviceResponse);

      const context = createMockAuthenticatedContext();

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(result.body).toEqual(serviceResponse);
      expect(result.headers["content-type"]).toBe("application/json");
    });
  });
});

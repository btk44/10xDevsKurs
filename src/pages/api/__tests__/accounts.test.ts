import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../accounts";
import {
  createMockAuthenticatedContext,
  createMockUnauthenticatedContext,
  createMockRequestWithQuery,
  createMockJSONRequest,
  parseResponse,
} from "../../../../tests/mocks/api";
import { createMockSupabaseClient } from "../../../../tests/mocks/supabase";

// Mock the AccountService
vi.mock("../../../lib/services/AccountService", () => ({
  AccountService: vi.fn(),
}));

// Mock the validation schemas
vi.mock("../../../lib/validation/schemas", () => ({
  CreateAccountCommandSchema: {
    safeParse: vi.fn(),
  },
}));

// Mock the validation utils
vi.mock("../../../lib/validation/utils", () => ({
  validateRequestBody: vi.fn(),
}));

import { AccountService } from "../../../lib/services/AccountService";
import { CreateAccountCommandSchema } from "../../../lib/validation/schemas";
import { validateRequestBody } from "../../../lib/validation/utils";

describe("GET /api/accounts", () => {
  let mockAccountService: any;
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    mockAccountService = {
      getAccountsByUserId: vi.fn(),
      createAccount: vi.fn(),
    };
    (AccountService as any).mockImplementation(() => mockAccountService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Request Validation & Input Handling", () => {
    it("validates include_inactive query parameter successfully", async () => {
      const mockAccounts = [{ id: 1, name: "Test Account", balance: 100, is_active: true }];

      mockAccountService.getAccountsByUserId.mockResolvedValue(mockAccounts);

      const context = createMockAuthenticatedContext();
      context.request = createMockRequestWithQuery("/api/accounts", {
        include_inactive: "true",
      });

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(mockAccountService.getAccountsByUserId).toHaveBeenCalledWith("test-user-id", true);
      expect(response.status).toBe(200);
      expect(result.body).toMatchInlineSnapshot(`
        {
          "data": [
            {
              "balance": 100,
              "id": 1,
              "is_active": true,
              "name": "Test Account",
            },
          ],
        }
      `);
    });

    it("defaults include_inactive to false when not provided", async () => {
      const mockAccounts = [{ id: 1, name: "Active Account", balance: 50, is_active: true }];

      mockAccountService.getAccountsByUserId.mockResolvedValue(mockAccounts);

      const context = createMockAuthenticatedContext();
      context.request = createMockRequestWithQuery("/api/accounts");

      await GET(context);

      expect(mockAccountService.getAccountsByUserId).toHaveBeenCalledWith("test-user-id", false);
    });

    it("rejects invalid include_inactive parameter values", async () => {
      const context = createMockAuthenticatedContext();
      context.request = createMockRequestWithQuery("/api/accounts", {
        include_inactive: "invalid",
      });

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(result.body.error.code).toBe("VALIDATION_ERROR");
      expect(result.body.error.message).toBe("Invalid query parameters");
      expect(result.body.error.details).toEqual([
        {
          field: "include_inactive",
          message: "Must be 'true' or 'false'",
        },
      ]);
    });

    it("accepts include_inactive=false explicitly", async () => {
      const mockAccounts = [{ id: 1, name: "Account", balance: 0, is_active: true }];

      mockAccountService.getAccountsByUserId.mockResolvedValue(mockAccounts);

      const context = createMockAuthenticatedContext();
      context.request = createMockRequestWithQuery("/api/accounts", {
        include_inactive: "false",
      });

      await GET(context);

      expect(mockAccountService.getAccountsByUserId).toHaveBeenCalledWith("test-user-id", false);
    });
  });

  describe("Authentication & Authorization Logic", () => {
    it("returns 401 when user is not authenticated", async () => {
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

    it("passes authenticated user context to service layer", async () => {
      const userId = "authenticated-user-123";
      const mockAccounts = [];

      mockAccountService.getAccountsByUserId.mockResolvedValue(mockAccounts);

      const context = createMockAuthenticatedContext(userId);

      await GET(context);

      expect(mockAccountService.getAccountsByUserId).toHaveBeenCalledWith(userId, false);
    });
  });

  describe("Error Handling & Response Formatting", () => {
    it("handles database errors gracefully", async () => {
      mockAccountService.getAccountsByUserId.mockRejectedValue(new Error("Failed to fetch accounts"));

      const context = createMockAuthenticatedContext();

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(500);
      expect(result.body.error.code).toBe("DATABASE_ERROR");
      expect(result.body.error.message).toBe("Failed to retrieve accounts from database");
    });

    it("handles unexpected errors with generic response", async () => {
      mockAccountService.getAccountsByUserId.mockRejectedValue(new Error("Unexpected error"));

      const context = createMockAuthenticatedContext();

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(500);
      expect(result.body.error.code).toBe("INTERNAL_ERROR");
      expect(result.body.error.message).toBe("An unexpected error occurred");
    });

    it("returns proper content-type headers", async () => {
      const mockAccounts = [];
      mockAccountService.getAccountsByUserId.mockResolvedValue(mockAccounts);

      const context = createMockAuthenticatedContext();

      const response = await GET(context);

      expect(response.headers.get("Content-Type")).toBe("application/json");
    });
  });

  describe("Business Logic Integration", () => {
    it("successfully retrieves and returns user accounts", async () => {
      const mockAccounts = [
        {
          id: 1,
          name: "Checking Account",
          balance: 1500.5,
          is_active: true,
          currency_code: "USD",
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: 2,
          name: "Savings Account",
          balance: 5000.0,
          is_active: true,
          currency_code: "USD",
          created_at: "2024-01-02T00:00:00Z",
        },
      ];

      mockAccountService.getAccountsByUserId.mockResolvedValue(mockAccounts);

      const context = createMockAuthenticatedContext();

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(mockAccountService.getAccountsByUserId).toHaveBeenCalledWith("test-user-id", false);
      expect(response.status).toBe(200);
      expect(result.body.data).toEqual(mockAccounts);
    });

    it("handles empty accounts list correctly", async () => {
      mockAccountService.getAccountsByUserId.mockResolvedValue([]);

      const context = createMockAuthenticatedContext();

      const response = await GET(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(result.body.data).toEqual([]);
    });

    it("initializes AccountService with correct supabase client", async () => {
      const mockAccounts = [];
      mockAccountService.getAccountsByUserId.mockResolvedValue(mockAccounts);

      const context = createMockAuthenticatedContext();

      await GET(context);

      expect(AccountService).toHaveBeenCalledWith(context.locals.supabase);
    });
  });
});

describe("POST /api/accounts", () => {
  let mockAccountService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAccountService = {
      getAccountsByUserId: vi.fn(),
      createAccount: vi.fn(),
    };
    (AccountService as any).mockImplementation(() => mockAccountService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Request Validation & Input Handling", () => {
    it("validates account creation command successfully", async () => {
      const createCommand = {
        name: "New Account",
        currency_code: "USD",
        initial_balance: 0,
      };

      const createdAccount = {
        id: 123,
        ...createCommand,
        balance: 0,
        is_active: true,
        created_at: "2024-01-15T10:00:00Z",
      };

      (validateRequestBody as any).mockReturnValue({
        success: true,
        data: createCommand,
      });

      mockAccountService.createAccount.mockResolvedValue(createdAccount);

      const context = createMockAuthenticatedContext();
      context.request = createMockJSONRequest(createCommand);

      const response = await POST(context);
      const result = await parseResponse(response);

      expect(validateRequestBody).toHaveBeenCalledWith(CreateAccountCommandSchema, createCommand);
      expect(mockAccountService.createAccount).toHaveBeenCalledWith(createCommand, "test-user-id");
      expect(response.status).toBe(201);
      expect(result.body).toMatchInlineSnapshot(`
        {
          "data": {
            "balance": 0,
            "created_at": "2024-01-15T10:00:00Z",
            "currency_code": "USD",
            "id": 123,
            "initial_balance": 0,
            "is_active": true,
            "name": "New Account",
          },
        }
      `);
    });

    it("handles malformed JSON in request body", async () => {
      const context = createMockAuthenticatedContext();
      context.request = new Request("http://localhost:4321/api/accounts", {
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

    it("validates request body against schema", async () => {
      const invalidCommand = { invalidField: "value" };

      (validateRequestBody as any).mockReturnValue({
        success: false,
        errors: [
          { field: "name", message: "Name is required" },
          { field: "currency_code", message: "Currency code is required" },
        ],
      });

      const context = createMockAuthenticatedContext();
      context.request = createMockJSONRequest(invalidCommand);

      const response = await POST(context);
      const result = await parseResponse(response);

      expect(validateRequestBody).toHaveBeenCalledWith(CreateAccountCommandSchema, invalidCommand);
      expect(response.status).toBe(400);
      expect(result.body.error.code).toBe("VALIDATION_ERROR");
      expect(result.body.error.message).toBe("Validation failed");
    });
  });

  describe("Authentication & Authorization Logic", () => {
    it("returns 401 when user is not authenticated for POST", async () => {
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

    it("passes authenticated user context to createAccount method", async () => {
      const userId = "authenticated-user-456";
      const createCommand = { name: "Test Account", currency_code: "EUR" };

      (validateRequestBody as any).mockReturnValue({
        success: true,
        data: createCommand,
      });

      mockAccountService.createAccount.mockResolvedValue({ id: 1, ...createCommand });

      const context = createMockAuthenticatedContext(userId);
      context.request = createMockJSONRequest(createCommand);

      await POST(context);

      expect(mockAccountService.createAccount).toHaveBeenCalledWith(createCommand, userId);
    });
  });

  describe("Error Handling & Response Formatting", () => {
    it("handles currency not found error", async () => {
      const createCommand = { name: "Test Account", currency_code: "INVALID" };

      (validateRequestBody as any).mockReturnValue({
        success: true,
        data: createCommand,
      });

      mockAccountService.createAccount.mockRejectedValue(new Error("CURRENCY_NOT_FOUND"));

      const context = createMockAuthenticatedContext();
      context.request = createMockJSONRequest(createCommand);

      const response = await POST(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(404);
      expect(result.body.error.code).toBe("CURRENCY_NOT_FOUND");
      expect(result.body.error.message).toBe("Currency does not exist");
    });

    it("handles database operation failures", async () => {
      const createCommand = { name: "Test Account", currency_code: "USD" };

      (validateRequestBody as any).mockReturnValue({
        success: true,
        data: createCommand,
      });

      mockAccountService.createAccount.mockRejectedValue(new Error("Failed to create account"));

      const context = createMockAuthenticatedContext();
      context.request = createMockJSONRequest(createCommand);

      const response = await POST(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(500);
      expect(result.body.error.code).toBe("DATABASE_ERROR");
      expect(result.body.error.message).toBe("Failed to create account");
    });

    it("handles unexpected errors with generic response", async () => {
      const createCommand = { name: "Test Account", currency_code: "USD" };

      (validateRequestBody as any).mockReturnValue({
        success: true,
        data: createCommand,
      });

      mockAccountService.createAccount.mockRejectedValue(new Error("Unexpected database error"));

      const context = createMockAuthenticatedContext();
      context.request = createMockJSONRequest(createCommand);

      const response = await POST(context);
      const result = await parseResponse(response);

      expect(response.status).toBe(500);
      expect(result.body.error.code).toBe("INTERNAL_ERROR");
      expect(result.body.error.message).toBe("An unexpected error occurred");
    });

    it("returns proper status and headers for successful creation", async () => {
      const createCommand = { name: "Test Account", currency_code: "USD" };
      const createdAccount = { id: 1, name: "Test Account", currency_code: "USD" };

      (validateRequestBody as any).mockReturnValue({
        success: true,
        data: createCommand,
      });

      mockAccountService.createAccount.mockResolvedValue(createdAccount);

      const context = createMockAuthenticatedContext();
      context.request = createMockJSONRequest(createCommand);

      const response = await POST(context);

      expect(response.status).toBe(201);
      expect(response.headers.get("Content-Type")).toBe("application/json");
    });
  });

  describe("Business Logic Integration", () => {
    it("successfully creates account and returns created resource", async () => {
      const createCommand = {
        name: "Investment Account",
        currency_code: "USD",
        initial_balance: 1000,
      };

      const createdAccount = {
        id: 456,
        name: "Investment Account",
        currency_code: "USD",
        balance: 1000,
        is_active: true,
        created_at: "2024-01-20T15:30:00Z",
        updated_at: "2024-01-20T15:30:00Z",
      };

      (validateRequestBody as any).mockReturnValue({
        success: true,
        data: createCommand,
      });

      mockAccountService.createAccount.mockResolvedValue(createdAccount);

      const context = createMockAuthenticatedContext();
      context.request = createMockJSONRequest(createCommand);

      const response = await POST(context);
      const result = await parseResponse(response);

      expect(mockAccountService.createAccount).toHaveBeenCalledWith(createCommand, "test-user-id");
      expect(response.status).toBe(201);
      expect(result.body.data).toEqual(createdAccount);
    });

    it("initializes AccountService with correct supabase client for POST", async () => {
      const createCommand = { name: "Test", currency_code: "USD" };

      (validateRequestBody as any).mockReturnValue({
        success: true,
        data: createCommand,
      });

      mockAccountService.createAccount.mockResolvedValue({ id: 1, ...createCommand });

      const context = createMockAuthenticatedContext();
      context.request = createMockJSONRequest(createCommand);

      await POST(context);

      expect(AccountService).toHaveBeenCalledWith(context.locals.supabase);
    });
  });
});

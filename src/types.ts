import type { Tables, TablesInsert, TablesUpdate, Enums } from "./db/database.types";

// ============================================================================
// Enums
// ============================================================================

export type CategoryType = Enums<"category_type_enum">;

// ============================================================================
// Currency DTOs
// ============================================================================

/**
 * Currency Data Transfer Object
 * Used in GET /api/currencies responses
 */
export type CurrencyDTO = Pick<Tables<"currencies">, "id" | "code" | "description" | "active">;

// ============================================================================
// Account DTOs and Commands
// ============================================================================

/**
 * Account Data Transfer Object with calculated balance
 * Used in GET /api/accounts and GET /api/accounts/:id responses
 * Includes currency details and calculated balance from view
 */
export interface AccountDTO {
  id: number;
  user_id: string;
  name: string;
  currency_id: number;
  currency_code: string;
  currency_description: string;
  tag: string | null;
  balance: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Command model for creating a new account
 * Used in POST /api/accounts request body
 */
export type CreateAccountCommand = Pick<TablesInsert<"accounts">, "name" | "currency_id" | "tag">;

/**
 * Command model for updating an existing account
 * Used in PATCH /api/accounts/:id request body
 * All fields are optional
 */
export type UpdateAccountCommand = Partial<Pick<TablesUpdate<"accounts">, "name" | "currency_id" | "tag">>;

// ============================================================================
// Category DTOs and Commands
// ============================================================================

/**
 * Category Data Transfer Object
 * Used in GET /api/categories and GET /api/categories/:id responses
 */
export type CategoryDTO = Pick<
  Tables<"categories">,
  "id" | "user_id" | "name" | "category_type" | "parent_id" | "tag" | "active" | "created_at" | "updated_at"
>;

/**
 * Command model for creating a new category
 * Used in POST /api/categories request body
 */
export type CreateCategoryCommand = Pick<TablesInsert<"categories">, "name" | "category_type" | "parent_id" | "tag">;

/**
 * Command model for updating an existing category
 * Used in PATCH /api/categories/:id request body
 * All fields are optional
 */
export type UpdateCategoryCommand = Partial<
  Pick<TablesUpdate<"categories">, "name" | "category_type" | "parent_id" | "tag">
>;

// ============================================================================
// Transaction DTOs and Commands
// ============================================================================

/**
 * Transaction Data Transfer Object with joined data
 * Used in GET /api/transactions and GET /api/transactions/:id responses
 * Includes account name, category name/type, and currency code from joins
 */
export type TransactionDTO = Pick<
  Tables<"transactions">,
  | "id"
  | "user_id"
  | "transaction_date"
  | "account_id"
  | "category_id"
  | "amount"
  | "currency_id"
  | "comment"
  | "active"
  | "created_at"
  | "updated_at"
> & {
  account_name: string;
  category_name: string;
  category_type: CategoryType;
  currency_code: string;
};

/**
 * Command model for creating a new transaction
 * Used in POST /api/transactions request body
 */
export type CreateTransactionCommand = Pick<
  TablesInsert<"transactions">,
  "transaction_date" | "account_id" | "category_id" | "amount" | "currency_id" | "comment"
>;

/**
 * Command model for updating an existing transaction
 * Used in PATCH /api/transactions/:id request body
 * All fields are optional
 */
export type UpdateTransactionCommand = Partial<
  Pick<
    TablesUpdate<"transactions">,
    "transaction_date" | "account_id" | "category_id" | "amount" | "currency_id" | "comment"
  >
>;

// ============================================================================
// Report DTOs
// ============================================================================

/**
 * Category summary for monthly reports
 * Contains aggregated transaction data for a specific category
 */
export interface CategorySummaryDTO {
  category_id: number;
  category_name: string;
  category_type: CategoryType;
  parent_id: number;
  total_amount: number;
  transaction_count: number;
}

/**
 * Monthly summary totals
 */
export interface MonthlySummaryTotalsDTO {
  total_income: number;
  total_expenses: number;
  net_balance: number;
}

/**
 * Monthly summary report Data Transfer Object
 * Used in GET /api/reports/monthly-summary response
 * Provides hierarchical category aggregation for a specific month
 */
export interface MonthlySummaryDTO {
  year: number;
  month: number;
  report_date: string;
  income_categories: CategorySummaryDTO[];
  expense_categories: CategorySummaryDTO[];
  totals: MonthlySummaryTotalsDTO;
}

// ============================================================================
// Utility DTOs
// ============================================================================

/**
 * Pagination metadata
 * Used in paginated list responses
 */
export interface PaginationDTO {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
}

/**
 * Validation error detail
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
}

/**
 * Standard error response structure
 * Used for all API error responses
 */
export interface ErrorDTO {
  code: string;
  message: string;
  details?: ValidationErrorDetail[] | Record<string, unknown>;
}

// ============================================================================
// API Response Wrappers
// ============================================================================

/**
 * Standard single resource response wrapper
 */
export interface ApiResponse<T> {
  data: T;
}

/**
 * Standard collection response wrapper with pagination
 */
export interface ApiCollectionResponse<T> {
  data: T[];
  pagination?: PaginationDTO;
}

/**
 * Standard error response wrapper
 */
export interface ApiErrorResponse {
  error: ErrorDTO;
}

// ============================================================================
// Query Parameter Types
// ============================================================================

/**
 * Query parameters for GET /api/accounts
 */
export interface GetAccountsQuery {
  include_inactive?: boolean;
}

/**
 * Query parameters for GET /api/categories
 */
export interface GetCategoriesQuery {
  type?: CategoryType;
  parent_id?: number;
  include_inactive?: boolean;
}

/**
 * Query parameters for GET /api/transactions
 */
export interface GetTransactionsQuery {
  date_from?: string;
  date_to?: string;
  account_id?: number;
  category_id?: number;
  search?: string;
  sort?: "transaction_date:asc" | "transaction_date:desc" | "amount:asc" | "amount:desc";
  page?: number;
  limit?: number;
  include_inactive?: boolean;
}

/**
 * Type alias for transaction sort options
 */
export type SortOption = "transaction_date:asc" | "transaction_date:desc" | "amount:asc" | "amount:desc";

/**
 * Query parameters for GET /api/reports/monthly-summary
 */
export interface GetMonthlySummaryQuery {
  year?: number;
  month?: number;
}

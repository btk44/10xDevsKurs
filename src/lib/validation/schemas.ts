import { z } from "zod";

// ============================================================================
// Account Validation Schemas
// ============================================================================

/**
 * Schema for validating CreateAccountCommand
 * Validates account creation request data according to business rules
 */
export const CreateAccountCommandSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .min(1, "Name cannot be empty")
    .max(100, "Name cannot exceed 100 characters")
    .transform((val) => val.trim()),
  currency_id: z
    .number({ required_error: "Currency ID is required" })
    .int("Currency ID must be an integer")
    .positive("Currency ID must be a positive integer"),
  tag: z.string().max(10, "Tag cannot exceed 10 characters").optional(),
});

/**
 * Schema for validating UpdateAccountCommand
 * All fields are optional for partial updates
 */
export const UpdateAccountCommandSchema = z.object({
  name: z
    .string()
    .min(1, "Name cannot be empty")
    .max(100, "Name cannot exceed 100 characters")
    .transform((val) => val.trim())
    .optional(),
  currency_id: z
    .number()
    .int("Currency ID must be an integer")
    .positive("Currency ID must be a positive integer")
    .optional(),
  tag: z.string().max(10, "Tag cannot exceed 10 characters").optional(),
});

/**
 * Schema for validating GetAccountsQuery parameters
 */
export const GetAccountsQuerySchema = z.object({
  include_inactive: z
    .enum(["true", "false"])
    .optional()
    .transform((val) => val === "true"),
});

// ============================================================================
// Category Validation Schemas
// ============================================================================

/**
 * Schema for validating CreateCategoryCommand
 */
export const CreateCategoryCommandSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .min(1, "Name cannot be empty")
    .max(100, "Name cannot exceed 100 characters")
    .transform((val) => val.trim()),
  category_type: z.enum(["income", "expense"], {
    required_error: "Category type is required",
    invalid_type_error: "Category type must be either 'income' or 'expense'",
  }),
  parent_id: z.number().int("Parent ID must be an integer").positive("Parent ID must be a positive integer").optional(),
  tag: z.string().max(10, "Tag cannot exceed 10 characters").optional(),
});

/**
 * Schema for validating UpdateCategoryCommand
 */
export const UpdateCategoryCommandSchema = z.object({
  name: z
    .string()
    .min(1, "Name cannot be empty")
    .max(100, "Name cannot exceed 100 characters")
    .transform((val) => val.trim())
    .optional(),
  category_type: z
    .enum(["income", "expense"], {
      invalid_type_error: "Category type must be either 'income' or 'expense'",
    })
    .optional(),
  parent_id: z.number().int("Parent ID must be an integer").positive("Parent ID must be a positive integer").optional(),
  tag: z.string().max(10, "Tag cannot exceed 10 characters").optional(),
});

/**
 * Schema for validating GetCategoriesQuery parameters
 */
export const GetCategoriesQuerySchema = z.object({
  type: z.enum(["income", "expense"]).optional(),
  parent_id: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive())
    .optional(),
  include_inactive: z
    .string()
    .transform((val) => val === "true")
    .pipe(z.boolean())
    .optional(),
});

// ============================================================================
// Transaction Validation Schemas
// ============================================================================

/**
 * Schema for validating CreateTransactionCommand
 */
export const CreateTransactionCommandSchema = z.object({
  transaction_date: z
    .string({ required_error: "Transaction date is required" })
    .datetime("Transaction date must be a valid ISO datetime"),
  account_id: z
    .number({ required_error: "Account ID is required" })
    .int("Account ID must be an integer")
    .positive("Account ID must be a positive integer"),
  category_id: z
    .number({ required_error: "Category ID is required" })
    .int("Category ID must be an integer")
    .positive("Category ID must be a positive integer"),
  amount: z.number({ required_error: "Amount is required" }).positive("Amount must be positive"),
  currency_id: z
    .number({ required_error: "Currency ID is required" })
    .int("Currency ID must be an integer")
    .positive("Currency ID must be a positive integer"),
  comment: z.string().max(500, "Comment cannot exceed 500 characters").optional(),
});

/**
 * Schema for validating UpdateTransactionCommand
 */
export const UpdateTransactionCommandSchema = z.object({
  transaction_date: z.string().datetime("Transaction date must be a valid ISO datetime").optional(),
  account_id: z
    .number()
    .int("Account ID must be an integer")
    .positive("Account ID must be a positive integer")
    .optional(),
  category_id: z
    .number()
    .int("Category ID must be an integer")
    .positive("Category ID must be a positive integer")
    .optional(),
  amount: z.number().positive("Amount must be positive").optional(),
  currency_id: z
    .number()
    .int("Currency ID must be an integer")
    .positive("Currency ID must be a positive integer")
    .optional(),
  comment: z.string().max(500, "Comment cannot exceed 500 characters").optional(),
});

/**
 * Schema for validating GetTransactionsQuery parameters
 */
export const GetTransactionsQuerySchema = z.object({
  date_from: z.string().datetime("Date from must be a valid ISO datetime").optional(),
  date_to: z.string().datetime("Date to must be a valid ISO datetime").optional(),
  account_id: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive())
    .optional(),
  category_id: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive())
    .optional(),
  search: z.string().min(1, "Search term cannot be empty").optional(),
  sort: z.enum(["transaction_date:asc", "transaction_date:desc", "amount:asc", "amount:desc"]).optional(),
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive())
    .optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive().max(100))
    .optional(),
  include_inactive: z
    .string()
    .transform((val) => val === "true")
    .pipe(z.boolean())
    .optional(),
});

// ============================================================================
// Report Validation Schemas
// ============================================================================

/**
 * Schema for validating GetMonthlySummaryQuery parameters
 */
export const GetMonthlySummaryQuerySchema = z.object({
  year: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(2000).max(2100))
    .optional(),
  month: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(12))
    .optional(),
});

// ============================================================================
// Common Validation Schemas
// ============================================================================

/**
 * Schema for validating numeric ID parameters in URLs
 */
export const IdParamSchema = z
  .string()
  .transform((val) => parseInt(val, 10))
  .pipe(z.number().int().positive());

/**
 * Schema for validating boolean query parameters
 */
export const BooleanQueryParamSchema = z
  .string()
  .transform((val) => val === "true")
  .pipe(z.boolean());

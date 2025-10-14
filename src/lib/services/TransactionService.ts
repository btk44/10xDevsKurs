import type { supabaseClient } from "../../db/supabase.client";
import type {
  TransactionDTO,
  CreateTransactionCommand,
  UpdateTransactionCommand,
  GetTransactionsQuery,
  ApiCollectionResponse,
  PaginationDTO,
} from "../../types";

/**
 * Security utilities for input sanitization and validation
 */
const SecurityUtils = {
  /**
   * Sanitizes string input to prevent potential injection attacks
   */
  sanitizeString(input: string | null | undefined): string | null {
    if (!input) return null;

    // Remove potentially dangerous characters and normalize whitespace
    return input
      .replace(/[<>'"&]/g, "") // Remove HTML/XML dangerous chars
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim()
      .substring(0, 1000); // Limit length as additional safety
  },

  /**
   * Validates that numeric IDs are within reasonable bounds
   */
  validateNumericId(id: number, fieldName: string): void {
    if (!Number.isInteger(id) || id <= 0 || id > Number.MAX_SAFE_INTEGER) {
      throw new Error(`Invalid ${fieldName}: must be a positive integer within safe bounds`);
    }
  },

  /**
   * Validates amount is within business constraints
   */
  validateAmount(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Amount must be a positive finite number");
    }

    if (amount > 9999999999.99) {
      throw new Error("Amount exceeds maximum allowed value");
    }

    // Check for reasonable decimal places (prevent floating point precision issues)
    const decimalPlaces = (amount.toString().split(".")[1] || "").length;
    if (decimalPlaces > 2) {
      throw new Error("Amount cannot have more than 2 decimal places");
    }
  },

  /**
   * Validates date string format and reasonableness
   */
  validateTransactionDate(dateString: string): void {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      throw new Error("Invalid transaction date format");
    }

    // Prevent dates too far in the past or future (business rule)
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

    if (date < oneYearAgo || date > oneYearFromNow) {
      throw new Error("Transaction date must be within one year of current date");
    }
  },
};

export class TransactionService {
  private supabase: typeof supabaseClient;

  constructor(supabase: typeof supabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Validates that an account exists, is active, and belongs to the user
   * @param accountId - The account ID to validate
   * @param userId - The user ID who should own the account
   * @returns Promise<boolean> - True if account exists, is active, and belongs to user
   * @throws Error if database query fails
   */
  async validateAccountOwnership(accountId: number, userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from("accounts")
        .select("id")
        .eq("id", accountId)
        .eq("user_id", userId)
        .eq("active", true)
        .single();

      if (error) {
        // If the error is that no rows were found, account doesn't exist or doesn't belong to user
        if (error.code === "PGRST116") {
          return false;
        }
        throw new Error(`Failed to validate account ownership: ${error.message}`);
      }

      return data !== null;
    } catch (error) {
      if (error instanceof Error && error.message.includes("Failed to validate account ownership")) {
        throw error;
      }
      throw new Error(`Failed to validate account ownership: ${error}`);
    }
  }

  /**
   * Validates that a category exists, is active, and belongs to the user
   * @param categoryId - The category ID to validate
   * @param userId - The user ID who should own the category
   * @returns Promise<boolean> - True if category exists, is active, and belongs to user
   * @throws Error if database query fails
   */
  async validateCategoryOwnership(categoryId: number, userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from("categories")
        .select("id")
        .eq("id", categoryId)
        .eq("user_id", userId)
        .eq("active", true)
        .single();

      if (error) {
        // If the error is that no rows were found, category doesn't exist or doesn't belong to user
        if (error.code === "PGRST116") {
          return false;
        }
        throw new Error(`Failed to validate category ownership: ${error.message}`);
      }

      return data !== null;
    } catch (error) {
      if (error instanceof Error && error.message.includes("Failed to validate category ownership")) {
        throw error;
      }
      throw new Error(`Failed to validate category ownership: ${error}`);
    }
  }

  /**
   * Validates that a currency exists and is active
   * @param currencyId - The currency ID to validate
   * @returns Promise<boolean> - True if currency exists and is active
   * @throws Error if database query fails
   */
  async validateCurrency(currencyId: number): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from("currencies")
        .select("id")
        .eq("id", currencyId)
        .eq("active", true)
        .single();

      if (error) {
        // If the error is that no rows were found, currency doesn't exist
        if (error.code === "PGRST116") {
          return false;
        }
        throw new Error(`Failed to validate currency: ${error.message}`);
      }

      return data !== null;
    } catch (error) {
      if (error instanceof Error && error.message.includes("Failed to validate currency")) {
        throw error;
      }
      throw new Error(`Failed to validate currency: ${error}`);
    }
  }

  /**
   * Update an existing transaction
   * @param command - The transaction update command with validated data
   * @param id - The transaction ID to update
   * @param userId - The user ID who owns the transaction
   * @returns Promise<TransactionDTO> - The updated transaction with joined data
   * @throws Error if validation fails or database operation fails
   */
  async updateTransaction(command: UpdateTransactionCommand, id: number, userId: string): Promise<TransactionDTO> {
    try {
      // Validate ID parameter
      SecurityUtils.validateNumericId(id, "transaction_id");

      // Additional security validation beyond schema validation
      if (command.account_id !== undefined) {
        SecurityUtils.validateNumericId(command.account_id, "account_id");
      }
      if (command.category_id !== undefined) {
        SecurityUtils.validateNumericId(command.category_id, "category_id");
      }
      if (command.currency_id !== undefined) {
        SecurityUtils.validateNumericId(command.currency_id, "currency_id");
      }
      if (command.amount !== undefined) {
        SecurityUtils.validateAmount(command.amount);
      }
      if (command.transaction_date !== undefined) {
        SecurityUtils.validateTransactionDate(command.transaction_date);
      }

      // Sanitize optional comment field
      const sanitizedComment =
        command.comment !== undefined ? SecurityUtils.sanitizeString(command.comment) : undefined;

      // First, verify the transaction exists and belongs to the user
      const { data: existingTransaction, error: fetchError } = await this.supabase
        .from("transactions")
        .select("id, user_id")
        .eq("id", id)
        .eq("user_id", userId)
        .eq("active", true)
        .single();

      if (fetchError || !existingTransaction) {
        if (fetchError?.code === "PGRST116") {
          throw new Error("Transaction not found or access denied");
        }
        throw new Error(`Failed to verify transaction ownership: ${fetchError?.message}`);
      }

      // Validate business rules in parallel for better performance (only for provided fields)
      const validationPromises: Promise<boolean>[] = [];

      if (command.account_id !== undefined) {
        validationPromises.push(this.validateAccountOwnership(command.account_id, userId));
      }
      if (command.category_id !== undefined) {
        validationPromises.push(this.validateCategoryOwnership(command.category_id, userId));
      }
      if (command.currency_id !== undefined) {
        validationPromises.push(this.validateCurrency(command.currency_id));
      }

      if (validationPromises.length > 0) {
        const validationResults = await Promise.all(validationPromises);
        let resultIndex = 0;

        if (command.account_id !== undefined && !validationResults[resultIndex++]) {
          throw new Error("Account not found or not accessible");
        }
        if (command.category_id !== undefined && !validationResults[resultIndex++]) {
          throw new Error("Category not found or not accessible");
        }
        if (command.currency_id !== undefined && !validationResults[resultIndex++]) {
          throw new Error("Currency not found");
        }
      }

      // Build update object with only provided fields
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (command.transaction_date !== undefined) updateData.transaction_date = command.transaction_date;
      if (command.account_id !== undefined) updateData.account_id = command.account_id;
      if (command.category_id !== undefined) updateData.category_id = command.category_id;
      if (command.amount !== undefined) updateData.amount = command.amount;
      if (command.currency_id !== undefined) updateData.currency_id = command.currency_id;
      if (sanitizedComment !== undefined) updateData.comment = sanitizedComment;

      // Update the transaction with optimized query
      const { error: updateError } = await this.supabase
        .from("transactions")
        .update(updateData)
        .eq("id", id)
        .eq("user_id", userId);

      if (updateError) {
        // Handle specific database constraint errors
        if (updateError.code === "23503") {
          // Foreign key violation
          throw new Error("Referenced account, category, or currency no longer exists");
        }
        if (updateError.code === "42501") {
          // Insufficient privilege (RLS)
          throw new Error("Access denied: insufficient permissions");
        }
        throw new Error(`Failed to update transaction: ${updateError.message}`);
      }

      // Fetch the updated transaction with optimized join query
      const { data: transactionWithJoins, error: selectError } = await this.supabase
        .from("transactions")
        .select(
          `
          id,
          user_id,
          transaction_date,
          account_id,
          category_id,
          amount,
          currency_id,
          comment,
          active,
          created_at,
          updated_at,
          accounts!transactions_account_id_fkey(name),
          categories!transactions_category_id_fkey(name, category_type),
          currencies!transactions_currency_id_fkey(code)
        `
        )
        .eq("id", id)
        .eq("user_id", userId)
        .single();

      if (selectError) {
        // Log error but don't expose internal details
        throw new Error("Transaction updated but failed to retrieve details");
      }

      // Transform the data to match TransactionDTO structure with null safety
      const transactionDTO: TransactionDTO = {
        id: transactionWithJoins.id,
        user_id: transactionWithJoins.user_id,
        transaction_date: transactionWithJoins.transaction_date,
        account_id: transactionWithJoins.account_id,
        account_name: transactionWithJoins.accounts?.name || "Unknown Account",
        category_id: transactionWithJoins.category_id,
        category_name: transactionWithJoins.categories?.name || "Unknown Category",
        category_type: transactionWithJoins.categories?.category_type || "expense",
        amount: transactionWithJoins.amount,
        currency_id: transactionWithJoins.currency_id,
        currency_code: transactionWithJoins.currencies?.code || "Unknown",
        comment: transactionWithJoins.comment,
        active: transactionWithJoins.active,
        created_at: transactionWithJoins.created_at,
        updated_at: transactionWithJoins.updated_at,
      };

      return transactionDTO;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to update transaction: ${error}`);
    }
  }

  /**
   * Creates a new transaction for the specified user
   * @param command - The transaction creation command with validated data
   * @param userId - The user ID who owns the transaction
   * @returns Promise<TransactionDTO> - The created transaction with joined data
   * @throws Error if validation fails or database operation fails
   */
  async create(command: CreateTransactionCommand, userId: string): Promise<TransactionDTO> {
    try {
      // Additional security validation beyond schema validation
      SecurityUtils.validateNumericId(command.account_id, "account_id");
      SecurityUtils.validateNumericId(command.category_id, "category_id");
      SecurityUtils.validateNumericId(command.currency_id, "currency_id");
      SecurityUtils.validateAmount(command.amount);
      SecurityUtils.validateTransactionDate(command.transaction_date);

      // Sanitize optional comment field
      const sanitizedComment = SecurityUtils.sanitizeString(command.comment);

      // Validate business rules in parallel for better performance
      const [isValidAccount, isValidCategory, isValidCurrency] = await Promise.all([
        this.validateAccountOwnership(command.account_id, userId),
        this.validateCategoryOwnership(command.category_id, userId),
        this.validateCurrency(command.currency_id),
      ]);

      if (!isValidAccount) {
        throw new Error("Account not found or not accessible");
      }

      if (!isValidCategory) {
        throw new Error("Category not found or not accessible");
      }

      if (!isValidCurrency) {
        throw new Error("Currency not found");
      }

      // Create the transaction with optimized insert and sanitized data
      const { data: insertedTransaction, error: insertError } = await this.supabase
        .from("transactions")
        .insert({
          user_id: userId,
          transaction_date: command.transaction_date,
          account_id: command.account_id,
          category_id: command.category_id,
          amount: command.amount,
          currency_id: command.currency_id,
          comment: sanitizedComment,
        })
        .select("id, created_at, updated_at")
        .single();

      if (insertError) {
        // Handle specific database constraint errors
        if (insertError.code === "23503") {
          // Foreign key violation
          throw new Error("Referenced account, category, or currency no longer exists");
        }
        if (insertError.code === "23505") {
          // Unique constraint violation
          throw new Error("Transaction already exists");
        }
        if (insertError.code === "42501") {
          // Insufficient privilege (RLS)
          throw new Error("Access denied: insufficient permissions");
        }
        throw new Error(`Failed to create transaction: ${insertError.message}`);
      }

      // Fetch the created transaction with optimized join query
      const { data: transactionWithJoins, error: fetchError } = await this.supabase
        .from("transactions")
        .select(
          `
          id,
          user_id,
          transaction_date,
          account_id,
          category_id,
          amount,
          currency_id,
          comment,
          active,
          created_at,
          updated_at,
          accounts!transactions_account_id_fkey(name),
          categories!transactions_category_id_fkey(name, category_type),
          currencies!transactions_currency_id_fkey(code)
        `
        )
        .eq("id", insertedTransaction.id)
        .eq("user_id", userId)
        .single();

      if (fetchError) {
        // Log error but don't expose internal details
        throw new Error("Transaction created but failed to retrieve details");
      }

      // Transform the data to match TransactionDTO structure with null safety
      const transactionDTO: TransactionDTO = {
        id: transactionWithJoins.id,
        user_id: transactionWithJoins.user_id,
        transaction_date: transactionWithJoins.transaction_date,
        account_id: transactionWithJoins.account_id,
        account_name: transactionWithJoins.accounts?.name || "Unknown Account",
        category_id: transactionWithJoins.category_id,
        category_name: transactionWithJoins.categories?.name || "Unknown Category",
        category_type: transactionWithJoins.categories?.category_type || "expense",
        amount: transactionWithJoins.amount,
        currency_id: transactionWithJoins.currency_id,
        currency_code: transactionWithJoins.currencies?.code || "Unknown",
        comment: transactionWithJoins.comment,
        active: transactionWithJoins.active,
        created_at: transactionWithJoins.created_at,
        updated_at: transactionWithJoins.updated_at,
      };

      return transactionDTO;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to create transaction: ${error}`);
    }
  }

  /**
   * Retrieves a single transaction by ID with joined data
   * @param transactionId - The transaction ID to retrieve
   * @param userId - The user ID who owns the transaction
   * @returns Promise<TransactionDTO | null> - The transaction with joined data or null if not found
   * @throws Error if database query fails or validation fails
   */
  async getTransactionById(transactionId: number, userId: string): Promise<TransactionDTO | null> {
    try {
      // Validate transaction ID parameter
      SecurityUtils.validateNumericId(transactionId, "transaction_id");

      // Execute optimized query with joins to get enriched transaction data
      const { data: transactionWithJoins, error } = await this.supabase
        .from("transactions")
        .select(
          `
          id,
          user_id,
          transaction_date,
          account_id,
          category_id,
          amount,
          currency_id,
          comment,
          active,
          created_at,
          updated_at,
          accounts!transactions_account_id_fkey(name),
          categories!transactions_category_id_fkey(name, category_type),
          currencies!transactions_currency_id_fkey(code)
        `
        )
        .eq("id", transactionId)
        .eq("user_id", userId)
        .eq("active", true) // Only return active transactions
        .single();

      if (error) {
        // Handle specific database errors
        if (error.code === "PGRST116") {
          // No rows found - transaction doesn't exist or doesn't belong to user
          return null;
        }
        if (error.code === "42501") {
          // Insufficient privilege (RLS)
          throw new Error("Access denied: insufficient permissions");
        }
        if (error.code === "42P01") {
          throw new Error("Database schema error: required tables not found");
        }
        if (error.code === "42703") {
          throw new Error("Database schema error: invalid column reference");
        }
        throw new Error(`Failed to fetch transaction: ${error.message}`);
      }

      // Validate required fields to prevent runtime errors
      if (!transactionWithJoins.id || !transactionWithJoins.user_id) {
        throw new Error("Invalid transaction data: missing required fields");
      }

      // Transform the data to match TransactionDTO structure with null safety
      const transactionDTO: TransactionDTO = {
        id: transactionWithJoins.id,
        user_id: transactionWithJoins.user_id,
        transaction_date: transactionWithJoins.transaction_date,
        account_id: transactionWithJoins.account_id,
        account_name: transactionWithJoins.accounts?.name || "Unknown Account",
        category_id: transactionWithJoins.category_id,
        category_name: transactionWithJoins.categories?.name || "Unknown Category",
        category_type: transactionWithJoins.categories?.category_type || "expense",
        amount: transactionWithJoins.amount,
        currency_id: transactionWithJoins.currency_id,
        currency_code: transactionWithJoins.currencies?.code || "Unknown",
        comment: transactionWithJoins.comment,
        active: transactionWithJoins.active,
        created_at: transactionWithJoins.created_at,
        updated_at: transactionWithJoins.updated_at,
      };

      return transactionDTO;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to fetch transaction: ${error}`);
    }
  }

  /**
   * Retrieves transactions for a user with filtering, sorting, and pagination
   * @param query - Query parameters for filtering and pagination
   * @param userId - The user ID to filter by
   * @returns Promise<ApiCollectionResponse<TransactionDTO>> - Paginated transaction list with metadata
   * @throws Error if database query fails
   */
  async getTransactions(query: GetTransactionsQuery, userId: string): Promise<ApiCollectionResponse<TransactionDTO>> {
    try {
      // Set defaults for pagination with bounds checking
      const page = Math.max(1, query.page || 1);
      const limit = Math.min(100, Math.max(1, query.limit || 50));
      const offset = (page - 1) * limit;
      const includeInactive = query.include_inactive || false;
      const sort = query.sort || "transaction_date:desc";

      // Validate date range if both dates are provided
      if (query.date_from && query.date_to) {
        const dateFrom = new Date(`${query.date_from}T00:00:00.000Z`);
        const dateTo = new Date(`${query.date_to}T23:59:59.999Z`);

        if (dateFrom > dateTo) {
          throw new Error("Invalid date range: date_from cannot be later than date_to");
        }
      }

      // Build optimized query with selective field loading
      // Use specific field selection to minimize data transfer
      let baseQuery = this.supabase
        .from("transactions")
        .select(
          `
          id,
          user_id,
          transaction_date,
          account_id,
          category_id,
          amount,
          currency_id,
          comment,
          active,
          created_at,
          updated_at,
          accounts!transactions_account_id_fkey(name),
          categories!transactions_category_id_fkey(name, category_type),
          currencies!transactions_currency_id_fkey(code)
        `,
          { count: "exact" }
        )
        .eq("user_id", userId);

      // Apply filters in optimal order (most selective first)
      // RLS filter (user_id) is applied first automatically

      // Apply active filter early to leverage partial indexes
      if (!includeInactive) {
        baseQuery = baseQuery.eq("active", true);
      }

      // Apply entity filters (high selectivity, good for index usage)
      if (query.account_id) {
        SecurityUtils.validateNumericId(query.account_id, "account_id");
        baseQuery = baseQuery.eq("account_id", query.account_id);
      }

      if (query.category_id) {
        SecurityUtils.validateNumericId(query.category_id, "category_id");
        baseQuery = baseQuery.eq("category_id", query.category_id);
      }

      // Apply date range filters (leverages date indexes)
      if (query.date_from) {
        baseQuery = baseQuery.gte("transaction_date", `${query.date_from}T00:00:00.000Z`);
      }
      if (query.date_to) {
        baseQuery = baseQuery.lte("transaction_date", `${query.date_to}T23:59:59.999Z`);
      }

      // Apply search filter last (least selective, requires table scan)
      if (query.search) {
        const sanitizedSearch = SecurityUtils.sanitizeString(query.search);
        if (sanitizedSearch && sanitizedSearch.length >= 2) {
          // Use case-insensitive LIKE with wildcards
          baseQuery = baseQuery.ilike("comment", `%${sanitizedSearch}%`);
        }
      }

      // Apply sorting with index-friendly options
      const [sortField, sortDirection] = sort.split(":");
      const isAscending = sortDirection === "asc";

      // Ensure we're sorting by indexed fields for optimal performance
      if (sortField === "transaction_date" || sortField === "amount") {
        baseQuery = baseQuery.order(sortField, { ascending: isAscending });
        // Add secondary sort by id for consistent pagination
        baseQuery = baseQuery.order("id", { ascending: true });
      } else {
        // Fallback to default sort if invalid sort field provided
        baseQuery = baseQuery.order("transaction_date", { ascending: false });
        baseQuery = baseQuery.order("id", { ascending: true });
      }

      // Apply pagination with range
      baseQuery = baseQuery.range(offset, offset + limit - 1);

      // Execute the optimized query
      const { data: transactions, error, count } = await baseQuery;

      if (error) {
        // Handle specific database errors with context
        if (error.code === "42501") {
          throw new Error("Access denied: insufficient permissions");
        }
        if (error.code === "42P01") {
          throw new Error("Database schema error: required tables not found");
        }
        if (error.code === "42703") {
          throw new Error("Database schema error: invalid column reference");
        }
        throw new Error(`Failed to fetch transactions: ${error.message}`);
      }

      // Transform the data to TransactionDTO format with enhanced null safety
      const transactionDTOs: TransactionDTO[] = (transactions || []).map((transaction) => {
        // Validate required fields to prevent runtime errors
        if (!transaction.id || !transaction.user_id) {
          throw new Error("Invalid transaction data: missing required fields");
        }

        return {
          id: transaction.id,
          user_id: transaction.user_id,
          transaction_date: transaction.transaction_date,
          account_id: transaction.account_id,
          account_name: transaction.accounts?.name || "Unknown Account",
          category_id: transaction.category_id,
          category_name: transaction.categories?.name || "Unknown Category",
          category_type: transaction.categories?.category_type || "expense",
          amount: transaction.amount,
          currency_id: transaction.currency_id,
          currency_code: transaction.currencies?.code || "Unknown",
          comment: transaction.comment,
          active: transaction.active,
          created_at: transaction.created_at,
          updated_at: transaction.updated_at,
        };
      });

      // Calculate pagination metadata
      const totalItems = count || 0;
      const totalPages = Math.ceil(totalItems / limit);

      const pagination: PaginationDTO = {
        page,
        limit,
        total_items: totalItems,
        total_pages: totalPages,
      };

      // Add performance metadata for monitoring
      const result: ApiCollectionResponse<TransactionDTO> = {
        data: transactionDTOs,
        pagination,
      };

      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to fetch transactions: ${error}`);
    }
  }

  /**
   * Performs soft delete on a transaction by setting active = false
   * This preserves the transaction for audit purposes while excluding it from business operations
   *
   * @param id - Transaction ID to delete
   * @param userId - User ID who owns the transaction
   * @param supabase - Supabase client instance
   * @throws Error if transaction not found, access denied, or database operation fails
   */
  static async deleteTransaction(id: number, userId: string, supabase: typeof supabaseClient): Promise<void> {
    // Input validation
    SecurityUtils.validateNumericId(id, "transaction ID");

    // First check if transaction exists and is owned by user
    const { data: existingTransaction, error: fetchError } = await supabase
      .from("transactions")
      .select("id, user_id, active")
      .eq("id", id)
      .eq("user_id", userId)
      .eq("active", true)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        throw new Error("Transaction not found or access denied");
      }
      throw new Error(`Failed to verify transaction: ${fetchError.message}`);
    }

    if (!existingTransaction) {
      throw new Error("Transaction not found or access denied");
    }

    // Perform soft delete
    const { error: updateError } = await supabase
      .from("transactions")
      .update({
        active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", userId)
      .eq("active", true);

    if (updateError) {
      throw new Error(`Failed to delete transaction: ${updateError.message}`);
    }

    // Transaction soft deleted successfully
  }
}

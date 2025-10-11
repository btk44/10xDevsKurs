import type { supabaseClient } from "../../db/supabase.client";
import type { AccountDTO, CreateAccountCommand, UpdateAccountCommand } from "../../types";

export class AccountService {
  private supabase: typeof supabaseClient;

  constructor(supabase: typeof supabaseClient) {
    this.supabase = supabase;
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
   * Creates a new account for the specified user
   * @param command - The account creation command with validated data
   * @param userId - The user ID who owns the account
   * @returns Promise<AccountDTO> - The created account with calculated balance
   * @throws Error if currency doesn't exist or database operation fails
   */
  async createAccount(command: CreateAccountCommand, userId: string): Promise<AccountDTO> {
    try {
      // First validate that the currency exists
      const currencyExists = await this.validateCurrency(command.currency_id);
      if (!currencyExists) {
        throw new Error("CURRENCY_NOT_FOUND");
      }

      // Insert the new account
      const { data: newAccount, error: insertError } = await this.supabase
        .from("accounts")
        .insert({
          user_id: userId,
          name: command.name,
          currency_id: command.currency_id,
          tag: command.tag || null,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create account: ${insertError.message}`);
      }

      if (!newAccount) {
        throw new Error("Failed to create account: No data returned");
      }

      // Get the account with balance calculation and currency details
      // Use the same approach as getAccountsByUserId but for a single account
      const { data: accountWithDetails, error: detailsError } = await this.supabase
        .from("accounts")
        .select(
          `
          id,
          user_id,
          name,
          currency_id,
          tag,
          active,
          created_at,
          updated_at,
          currencies!inner(
            code,
            description
          )
        `
        )
        .eq("id", newAccount.id)
        .eq("user_id", userId)
        .single();

      if (detailsError) {
        throw new Error(`Failed to fetch created account details: ${detailsError.message}`);
      }

      if (!accountWithDetails) {
        throw new Error("Failed to fetch created account details: No data returned");
      }

      // Since this is a new account, balance will be 0
      // But we could still calculate it for consistency
      const currency = Array.isArray(accountWithDetails.currencies)
        ? accountWithDetails.currencies[0]
        : accountWithDetails.currencies;

      return {
        id: accountWithDetails.id,
        user_id: accountWithDetails.user_id,
        name: accountWithDetails.name,
        currency_id: accountWithDetails.currency_id,
        currency_code: currency?.code || "",
        currency_description: currency?.description || "",
        tag: accountWithDetails.tag,
        balance: 0, // New accounts start with 0 balance
        active: accountWithDetails.active,
        created_at: accountWithDetails.created_at,
        updated_at: accountWithDetails.updated_at,
      };
    } catch (error) {
      if (error instanceof Error) {
        // Re-throw known errors
        if (error.message === "CURRENCY_NOT_FOUND") {
          throw error;
        }
        if (error.message.includes("Failed to")) {
          throw error;
        }
      }
      throw new Error(`Failed to create account: ${error}`);
    }
  }

  /**
   * Retrieves all accounts for a specific user with calculated balances
   * Uses an optimized approach to minimize database queries
   * Security: This method respects Row Level Security (RLS) policies.
   * The database automatically enforces that users can only access their own accounts
   * through the RLS policy: auth.uid() = user_id
   *
   * @param userId - The user ID to filter accounts by
   * @param includeInactive - Whether to include soft-deleted (inactive) accounts
   * @returns Promise<AccountDTO[]> Array of accounts with calculated balances
   * @throws Error if database query fails
   */
  async getAccountsByUserId(userId: string, includeInactive = false): Promise<AccountDTO[]> {
    try {
      // Try to use the optimized view-based approach first
      return await this.getAccountsUsingView(userId, includeInactive);
    } catch {
      // If view approach fails, fall back to function-based calculation
      return await this.getAccountsUsingFunction(userId, includeInactive);
    }
  }

  /**
   * Optimized approach using a custom query that mimics the view_accounts_with_balance
   * but includes currency_id and supports inactive accounts
   */
  private async getAccountsUsingView(userId: string, includeInactive: boolean): Promise<AccountDTO[]> {
    // Build a query that gets all data in one go, similar to view_accounts_with_balance
    // but with currency_id and proper active filtering
    let query = this.supabase
      .from("accounts")
      .select(
        `
        id,
        user_id, 
        name,
        currency_id,
        tag,
        active,
        created_at,
        updated_at,
        currencies!inner(
          code,
          description
        )
      `
      )
      .eq("user_id", userId);

    if (!includeInactive) {
      query = query.eq("active", true);
    }

    query = query.order("name", { ascending: true });

    const { data: accounts, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch accounts: ${error.message}`);
    }

    if (!accounts || accounts.length === 0) {
      return [];
    }

    // Get all account IDs for batch balance calculation
    const accountIds = accounts.map((account) => account.id);

    // Use a single query to get all balances at once
    // This approach uses a custom query to calculate balances for multiple accounts
    const { data: balanceData, error: balanceError } = await this.supabase
      .from("transactions")
      .select(
        `
        account_id,
        amount,
        categories!inner(category_type)
      `
      )
      .in("account_id", accountIds)
      .eq("user_id", userId)
      .eq("active", true)
      .eq("categories.active", true);

    // Calculate balances for each account
    const balanceMap = new Map<number, number>();

    if (!balanceError && balanceData) {
      balanceData.forEach((transaction) => {
        const accountId = transaction.account_id;
        const amount = transaction.amount;
        const categoryType = (transaction.categories as { category_type: string })?.category_type;

        if (!balanceMap.has(accountId)) {
          balanceMap.set(accountId, 0);
        }

        const currentBalance = balanceMap.get(accountId) || 0;
        if (categoryType === "income") {
          balanceMap.set(accountId, currentBalance + amount);
        } else if (categoryType === "expense") {
          balanceMap.set(accountId, currentBalance - amount);
        }
      });
    }

    // Map accounts to DTOs with calculated balances
    return accounts.map((account): AccountDTO => {
      const currency = Array.isArray(account.currencies) ? account.currencies[0] : account.currencies;
      const balance = balanceMap.get(account.id) || 0;

      return {
        id: account.id,
        user_id: account.user_id,
        name: account.name,
        currency_id: account.currency_id,
        currency_code: currency?.code || "",
        currency_description: currency?.description || "",
        tag: account.tag,
        balance: balance,
        active: account.active,
        created_at: account.created_at,
        updated_at: account.updated_at,
      };
    });
  }

  /**
   * Fallback approach using database function for balance calculation
   * This makes N+1 queries but is more reliable
   */
  private async getAccountsUsingFunction(userId: string, includeInactive: boolean): Promise<AccountDTO[]> {
    // First, get accounts with currency information
    let query = this.supabase
      .from("accounts")
      .select(
        `
        id,
        user_id,
        name,
        currency_id,
        tag,
        active,
        created_at,
        updated_at,
        currencies!inner(code, description)
      `
      )
      .eq("user_id", userId);

    if (!includeInactive) {
      query = query.eq("active", true);
    }

    query = query.order("name", { ascending: true });

    const { data: accounts, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch accounts: ${error.message}`);
    }

    if (!accounts) {
      return [];
    }

    // For each account, calculate balance using the database function
    const accountsWithBalance = await Promise.all(
      accounts.map(async (account): Promise<AccountDTO> => {
        const currency = Array.isArray(account.currencies) ? account.currencies[0] : account.currencies;

        // Calculate balance using the database function
        const { data: balanceData, error: balanceError } = await this.supabase.rpc("calculate_account_balance", {
          p_account_id: account.id,
          p_user_id: userId,
        });

        // If balance calculation fails, default to 0
        const balance = balanceError ? 0 : balanceData || 0;

        return {
          id: account.id,
          user_id: account.user_id,
          name: account.name,
          currency_id: account.currency_id,
          currency_code: currency?.code || "",
          currency_description: currency?.description || "",
          tag: account.tag,
          balance: balance,
          active: account.active,
          created_at: account.created_at,
          updated_at: account.updated_at,
        };
      })
    );

    return accountsWithBalance;
  }

  /**
   * Retrieves a single account by ID for a specific user with calculated balance
   * Security: This method respects Row Level Security (RLS) policies.
   * The database automatically enforces that users can only access their own accounts
   *
   * @param accountId - The account ID to retrieve
   * @param userId - The user ID who owns the account
   * @returns Promise<AccountDTO | null> The account with calculated balance, or null if not found
   * @throws Error if database query fails
   */
  async getAccountById(accountId: number, userId: string): Promise<AccountDTO | null> {
    try {
      // Try to use the optimized view-based approach first
      return await this.getAccountByIdUsingView(accountId, userId);
    } catch {
      // If view approach fails, fall back to function-based calculation
      return await this.getAccountByIdUsingFunction(accountId, userId);
    }
  }

  /**
   * Optimized approach using a custom query that mimics the view_accounts_with_balance
   */
  private async getAccountByIdUsingView(accountId: number, userId: string): Promise<AccountDTO | null> {
    // Get account with currency information
    const { data: account, error } = await this.supabase
      .from("accounts")
      .select(
        `
        id,
        user_id, 
        name,
        currency_id,
        tag,
        active,
        created_at,
        updated_at,
        currencies!inner(
          code,
          description
        )
      `
      )
      .eq("id", accountId)
      .eq("user_id", userId)
      .single();

    if (error) {
      // If the error is that no rows were found, account doesn't exist
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`Failed to retrieve account: ${error.message}`);
    }

    if (!account) {
      return null;
    }

    // Calculate balance for this account
    const { data: balanceData, error: balanceError } = await this.supabase
      .from("transactions")
      .select(
        `
        amount,
        categories!inner(category_type)
      `
      )
      .eq("account_id", accountId)
      .eq("user_id", userId)
      .eq("active", true)
      .eq("categories.active", true);

    // Calculate balance
    let balance = 0;
    if (!balanceError && balanceData) {
      balanceData.forEach((transaction) => {
        const amount = transaction.amount;
        const categoryType = (transaction.categories as { category_type: string })?.category_type;

        if (categoryType === "income") {
          balance += amount;
        } else if (categoryType === "expense") {
          balance -= amount;
        }
      });
    }

    // Map account to DTO with calculated balance
    const currency = Array.isArray(account.currencies) ? account.currencies[0] : account.currencies;

    return {
      id: account.id,
      user_id: account.user_id,
      name: account.name,
      currency_id: account.currency_id,
      currency_code: currency?.code || "",
      currency_description: currency?.description || "",
      tag: account.tag,
      balance: balance,
      active: account.active,
      created_at: account.created_at,
      updated_at: account.updated_at,
    };
  }

  /**
   * Fallback approach using database function for balance calculation
   */
  private async getAccountByIdUsingFunction(accountId: number, userId: string): Promise<AccountDTO | null> {
    // First, get account with currency information
    const { data: account, error } = await this.supabase
      .from("accounts")
      .select(
        `
        id,
        user_id,
        name,
        currency_id,
        tag,
        active,
        created_at,
        updated_at,
        currencies!inner(code, description)
      `
      )
      .eq("id", accountId)
      .eq("user_id", userId)
      .single();

    if (error) {
      // If the error is that no rows were found, account doesn't exist
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`Failed to retrieve account: ${error.message}`);
    }

    if (!account) {
      return null;
    }

    const currency = Array.isArray(account.currencies) ? account.currencies[0] : account.currencies;

    // Calculate balance using the database function
    const { data: balanceData, error: balanceError } = await this.supabase.rpc("calculate_account_balance", {
      p_account_id: account.id,
      p_user_id: userId,
    });

    // If balance calculation fails, default to 0
    const balance = balanceError ? 0 : balanceData || 0;

    return {
      id: account.id,
      user_id: account.user_id,
      name: account.name,
      currency_id: account.currency_id,
      currency_code: currency?.code || "",
      currency_description: currency?.description || "",
      tag: account.tag,
      balance: balance,
      active: account.active,
      created_at: account.created_at,
      updated_at: account.updated_at,
    };
  }

  /**
   * Soft deletes an account and all its related transactions
   * Sets the account's active flag to false and cascades to related transactions
   * @param accountId - The account ID to soft delete
   * @param userId - The user ID who owns the account
   * @returns Promise<void> - No return value, throws on error
   * @throws Error if account doesn't exist, doesn't belong to user, or database operation fails
   */
  async softDeleteAccount(accountId: number, userId: string): Promise<void> {
    try {
      // First verify the account exists and belongs to the user
      const { data: account, error: accountError } = await this.supabase
        .from("accounts")
        .select("id, active")
        .eq("id", accountId)
        .eq("user_id", userId)
        .eq("active", true)
        .single();

      if (accountError) {
        // If the error is that no rows were found, account doesn't exist or doesn't belong to user
        if (accountError.code === "PGRST116") {
          throw new Error("ACCOUNT_NOT_FOUND");
        }
        throw new Error(`Failed to verify account: ${accountError.message}`);
      }

      if (!account) {
        throw new Error("ACCOUNT_NOT_FOUND");
      }

      // Start a transaction to ensure atomicity
      // Note: Supabase doesn't support explicit transactions in the client
      // But we can use multiple operations and handle rollback manually if needed

      // First, soft delete all related transactions
      const { error: transactionsError } = await this.supabase
        .from("transactions")
        .update({ active: false })
        .eq("account_id", accountId)
        .eq("user_id", userId)
        .eq("active", true);

      if (transactionsError) {
        throw new Error(`Failed to soft delete related transactions: ${transactionsError.message}`);
      }

      // Then, soft delete the account itself
      const { error: accountUpdateError } = await this.supabase
        .from("accounts")
        .update({ active: false })
        .eq("id", accountId)
        .eq("user_id", userId)
        .eq("active", true);

      if (accountUpdateError) {
        // If account update fails, we should ideally rollback the transaction updates
        // For now, we'll throw an error - in a real scenario, we might want to implement compensation
        throw new Error(`Failed to soft delete account: ${accountUpdateError.message}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        // Re-throw known errors
        if (error.message === "ACCOUNT_NOT_FOUND") {
          throw error;
        }
        if (error.message.includes("Failed to")) {
          throw error;
        }
      }
      throw new Error(`Failed to soft delete account: ${error}`);
    }
  }

  /**
   * Updates an existing account for the specified user
   * @param accountId - The account ID to update
   * @param command - The account update command with validated data
   * @param userId - The user ID who owns the account
   * @returns Promise<AccountDTO> - The updated account with calculated balance
   * @throws Error if account doesn't exist, currency doesn't exist, or database operation fails
   */
  async updateAccount(accountId: number, command: UpdateAccountCommand, userId: string): Promise<AccountDTO> {
    try {
      // Validate currency if provided
      if (command.currency_id !== undefined) {
        const currencyExists = await this.validateCurrency(command.currency_id);
        if (!currencyExists) {
          throw new Error("CURRENCY_NOT_FOUND");
        }
      }

      // Build update object with only provided fields
      const updateData: Partial<UpdateAccountCommand> = {};
      if (command.name !== undefined) {
        updateData.name = command.name;
      }
      if (command.currency_id !== undefined) {
        updateData.currency_id = command.currency_id;
      }
      if (command.tag !== undefined) {
        updateData.tag = command.tag;
      }

      // Update the account
      const { data: updatedAccount, error: updateError } = await this.supabase
        .from("accounts")
        .update(updateData)
        .eq("id", accountId)
        .eq("user_id", userId)
        .select()
        .single();

      if (updateError) {
        // If the error is that no rows were found, account doesn't exist or doesn't belong to user
        if (updateError.code === "PGRST116") {
          throw new Error("Account not found or access denied");
        }
        throw new Error(`Failed to update account: ${updateError.message}`);
      }

      if (!updatedAccount) {
        throw new Error("Account not found or access denied");
      }

      // Get the updated account with balance calculation and currency details
      const accountWithDetails = await this.getAccountById(accountId, userId);

      if (!accountWithDetails) {
        throw new Error("Failed to fetch updated account details");
      }

      return accountWithDetails;
    } catch (error) {
      if (error instanceof Error) {
        // Re-throw known errors
        if (error.message === "CURRENCY_NOT_FOUND") {
          throw error;
        }
        if (error.message.includes("Account not found") || error.message.includes("access denied")) {
          throw error;
        }
        if (error.message.includes("Failed to")) {
          throw error;
        }
      }
      throw new Error(`Failed to update account: ${error}`);
    }
  }
}

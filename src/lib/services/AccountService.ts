import type { supabaseClient } from "../../db/supabase.client";
import type { AccountDTO, CreateAccountCommand } from "../../types";

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
}

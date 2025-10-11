import type { supabaseClient } from "../../db/supabase.client";
import type { CurrencyDTO } from "../../types";

export class CurrencyService {
  private supabase: typeof supabaseClient;

  constructor(supabase: typeof supabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Retrieves all active currencies from the database
   * @returns Promise<CurrencyDTO[]> Array of active currencies
   * @throws Error if database query fails
   */
  async getAllActiveCurrencies(): Promise<CurrencyDTO[]> {
    try {
      const { data, error } = await this.supabase
        .from("currencies")
        .select("id, code, description, active")
        .eq("active", true)
        .order("code", { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch currencies: ${error.message}`);
      }

      if (!data) {
        return [];
      }

      return data;
    } catch (error) {
      throw error instanceof Error ? error : new Error("Unexpected error occurred while fetching currencies");
    }
  }
}

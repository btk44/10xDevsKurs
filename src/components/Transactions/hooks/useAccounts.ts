import { useState, useEffect, useCallback } from "react";
import type { AccountDTO, ApiCollectionResponse } from "../../../types";

/**
 * Custom hook to fetch accounts
 */
export function useAccounts(includeInactive = false) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<AccountDTO[]>([]);

  // Create a refreshData function that can be called to force a refresh
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      queryParams.append("include_inactive", includeInactive.toString());

      const response = await fetch(`/api/accounts?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error(`Error fetching accounts: ${response.status}`);
      }

      const result = (await response.json()) as ApiCollectionResponse<AccountDTO>;
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error occurred"));
    } finally {
      setIsLoading(false);
    }
  }, [includeInactive]);

  // Call refreshData when includeInactive changes
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return { data, isLoading, error, refreshData };
}

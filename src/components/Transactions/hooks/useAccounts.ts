import { useState, useEffect } from "react";
import type { AccountDTO, ApiCollectionResponse } from "../../../types";

/**
 * Custom hook to fetch accounts
 */
export function useAccounts(includeInactive = false) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<AccountDTO[]>([]);

  useEffect(() => {
    const fetchAccounts = async () => {
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
    };

    fetchAccounts();
  }, [includeInactive]);

  return { data, isLoading, error };
}

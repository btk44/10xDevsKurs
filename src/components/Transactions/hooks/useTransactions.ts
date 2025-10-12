import { useState, useEffect } from "react";
import type { ApiCollectionResponse, GetTransactionsQuery, PaginationDTO, TransactionDTO } from "../../../types";

/**
 * Custom hook to fetch transactions based on filters
 */
export function useTransactions(filters: GetTransactionsQuery) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TransactionDTO[]>([]);
  const [pagination, setPagination] = useState<PaginationDTO>({
    page: filters.page || 1,
    limit: filters.limit || 10,
    total_items: 0,
    total_pages: 0
  });

  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Build query string from filters
        const queryParams = new URLSearchParams();
        
        if (filters.date_from) queryParams.append("date_from", filters.date_from);
        if (filters.date_to) queryParams.append("date_to", filters.date_to);
        if (filters.account_id) queryParams.append("account_id", filters.account_id.toString());
        if (filters.category_id) queryParams.append("category_id", filters.category_id.toString());
        if (filters.search) queryParams.append("search", filters.search);
        if (filters.sort) queryParams.append("sort", filters.sort);
        if (filters.page) queryParams.append("page", filters.page.toString());
        if (filters.limit) queryParams.append("limit", filters.limit.toString());
        if (filters.include_inactive !== undefined) queryParams.append("include_inactive", filters.include_inactive.toString());
        
        const response = await fetch(`/api/transactions?${queryParams.toString()}`);
        
        if (!response.ok) {
          throw new Error(`Error fetching transactions: ${response.status}`);
        }
        
        const result = await response.json() as ApiCollectionResponse<TransactionDTO>;
        setData(result.data);
        
        if (result.pagination) {
          setPagination(result.pagination);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error occurred"));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTransactions();
  }, [filters]);
  
  return { data, pagination, isLoading, error };
}

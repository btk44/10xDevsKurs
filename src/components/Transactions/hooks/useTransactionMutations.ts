import { useState } from "react";
import type { ApiResponse, CreateTransactionCommand, TransactionDTO, UpdateTransactionCommand } from "../../../types";

/**
 * Custom hook for transaction mutations (create, update, delete)
 */
export function useTransactionMutations() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Create a new transaction
   */
  const createTransaction = async (command: CreateTransactionCommand): Promise<TransactionDTO | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to create transaction");
      }

      const result = (await response.json()) as ApiResponse<TransactionDTO>;
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error occurred"));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Update an existing transaction
   */
  const updateTransaction = async (id: number, command: UpdateTransactionCommand): Promise<TransactionDTO | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to update transaction");
      }

      const result = (await response.json()) as ApiResponse<TransactionDTO>;
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error occurred"));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Delete a transaction
   */
  const deleteTransaction = async (id: number): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to delete transaction");
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error occurred"));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createTransaction,
    updateTransaction,
    deleteTransaction,
    isLoading,
    error,
  };
}

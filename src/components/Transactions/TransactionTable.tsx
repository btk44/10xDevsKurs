import { useState } from "react";
import type { PaginationDTO, SortOption, TransactionDTO } from "../../types";
import Pagination from "./Pagination";
import { Button } from "../ui/button";

interface TransactionTableProps {
  transactions: TransactionDTO[];
  pagination: PaginationDTO;
  sort: SortOption;
  onPageChange: (page: number) => void;
  onSortChange: (sort: SortOption) => void;
  onEdit: (transaction: TransactionDTO) => void;
  onDeleteClick: (transaction: TransactionDTO) => void;
}

/**
 * TransactionTable component
 * Displays a list of transactions in a sortable table with pagination
 */
export default function TransactionTable({
  transactions,
  pagination,
  sort,
  onPageChange,
  onSortChange,
  onEdit,
  onDeleteClick,
}: TransactionTableProps) {
  // State for tracking hover on rows
  const [hoveredRowId, setHoveredRowId] = useState<number | null>(null);

  // Function to toggle sort direction or set initial sort
  const handleSortClick = (column: string) => {
    if (sort.startsWith(column)) {
      // Toggle direction if already sorting by this column
      const newDirection = sort.endsWith(":asc") ? "desc" : "asc";
      onSortChange(`${column}:${newDirection}` as SortOption);
    } else {
      // Default to descending for new sort column
      onSortChange(`${column}:desc` as SortOption);
    }
  };

  // Helper to get sort indicator
  const getSortIndicator = (column: string) => {
    if (!sort.startsWith(column)) return null;
    return sort.endsWith(":asc") ? "↑" : "↓";
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Format amount for display
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Handle empty state
  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center" data-testid="transaction-table-empty">
        <h3 className="text-lg font-medium mb-2">No transactions found</h3>
        <p className="text-gray-500">Try adjusting your filters or add a new transaction.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden" data-testid="transaction-table">
      <div className="overflow-x-auto">
        <table className="w-full" data-testid="transaction-table-element">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th
                className="px-4 py-2 text-left cursor-pointer"
                onClick={() => handleSortClick("transaction_date")}
                data-testid="sort-date-header"
              >
                Date {getSortIndicator("transaction_date")}
              </th>
              <th className="px-4 py-2 text-left">Account</th>
              <th className="px-4 py-2 text-left">Category</th>
              <th
                className="px-4 py-2 text-right cursor-pointer"
                onClick={() => handleSortClick("amount")}
                data-testid="sort-amount-header"
              >
                Amount {getSortIndicator("amount")}
              </th>
              <th className="px-4 py-2 text-center">Currency</th>
              <th className="px-4 py-2 text-left">Comment</th>
              <th className="px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr
                key={transaction.id}
                className={`border-b hover:bg-gray-50 ${hoveredRowId === transaction.id ? "bg-gray-50" : ""}`}
                onMouseEnter={() => setHoveredRowId(transaction.id)}
                onMouseLeave={() => setHoveredRowId(null)}
                data-testid={`transaction-row-${transaction.id}`}
              >
                <td className="px-4 py-2">{formatDate(transaction.transaction_date)}</td>
                <td className="px-4 py-2">{transaction.account_name}</td>
                <td className="px-4 py-2">{transaction.category_name}</td>
                <td
                  className={`px-4 py-2 text-right ${
                    transaction.category_type === "expense" ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {formatAmount(transaction.amount)}
                </td>
                <td className="px-4 py-2 text-center">{transaction.currency_code}</td>
                <td className="px-4 py-2 truncate max-w-xs">{transaction.comment}</td>
                <td className="px-4 py-2 text-center">
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(transaction)}
                      aria-label={`Edit transaction ${transaction.id}`}
                      data-testid={`transaction-edit-button-${transaction.id}`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-1"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteClick(transaction)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      aria-label={`Delete transaction ${transaction.id}`}
                      data-testid={`transaction-delete-button-${transaction.id}`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-1"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-2 border-t" data-testid="transaction-table-pagination">
        <Pagination pagination={pagination} onPageChange={onPageChange} />
      </div>
    </div>
  );
}

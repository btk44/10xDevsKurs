import { useState } from "react";
import type { PaginationDTO, SortOption, TransactionDTO } from "../../types";
import Pagination from "./Pagination";

interface TransactionTableProps {
  transactions: TransactionDTO[];
  pagination: PaginationDTO;
  sort: SortOption;
  onPageChange: (page: number) => void;
  onSortChange: (sort: SortOption) => void;
  onRowDoubleClick: (transaction: TransactionDTO) => void;
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
  onRowDoubleClick,
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
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <h3 className="text-lg font-medium mb-2">No transactions found</h3>
        <p className="text-gray-500">Try adjusting your filters or add a new transaction.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-2 text-left cursor-pointer" onClick={() => handleSortClick("transaction_date")}>
                Date {getSortIndicator("transaction_date")}
              </th>
              <th className="px-4 py-2 text-left">Account</th>
              <th className="px-4 py-2 text-left">Category</th>
              <th className="px-4 py-2 text-right cursor-pointer" onClick={() => handleSortClick("amount")}>
                Amount {getSortIndicator("amount")}
              </th>
              <th className="px-4 py-2 text-center">Currency</th>
              <th className="px-4 py-2 text-left">Comment</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr
                key={transaction.id}
                className={`border-b hover:bg-gray-50 ${hoveredRowId === transaction.id ? "bg-gray-50" : ""}`}
                onMouseEnter={() => setHoveredRowId(transaction.id)}
                onMouseLeave={() => setHoveredRowId(null)}
                onDoubleClick={() => onRowDoubleClick(transaction)}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-2 border-t">
        <Pagination pagination={pagination} onPageChange={onPageChange} />
      </div>
    </div>
  );
}

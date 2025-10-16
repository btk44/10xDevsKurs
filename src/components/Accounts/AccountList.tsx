import { useState } from "react";
import type { AccountDTO } from "../../types";
import { Button } from "../ui/button";

interface AccountListProps {
  accounts: AccountDTO[];
  onEdit: (account: AccountDTO) => void;
  onDelete: (account: AccountDTO) => void;
}

type SortField = "name" | "balance" | "currency_code" | "created_at";
type SortDirection = "asc" | "desc";

export default function AccountList({ accounts, onEdit, onDelete }: AccountListProps) {
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Ensure accounts is always an array
  const accountsArray = Array.isArray(accounts) ? accounts : [];

  const sortedAccounts = [...accountsArray].sort((a, b) => {
    const direction = sortDirection === "asc" ? 1 : -1;

    switch (sortField) {
      case "name":
        return (a.name || "").localeCompare(b.name || "") * direction;
      case "balance":
        return ((a.balance || 0) - (b.balance || 0)) * direction;
      case "currency_code":
        return (a.currency_code || "").localeCompare(b.currency_code || "") * direction;
      case "created_at":
        return (new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()) * direction;
      default:
        return 0;
    }
  });

  // Helper for sort indicator
  const getSortIndicator = (field: SortField) => {
    if (field !== sortField) return null;
    return sortDirection === "asc" ? " ↑" : " ↓";
  };

  if (accountsArray.length === 0) {
    return (
      <div className="text-center py-8 border rounded-lg bg-gray-50" data-testid="no-accounts-message">
        <p className="text-gray-500">No accounts found. Create your first account above.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" data-testid="accounts-list-container">
      <table className="w-full border-collapse" role="table" data-testid="accounts-table">
        <thead>
          <tr className="bg-gray-100 border-b">
            <th
              className="px-4 py-2 text-left cursor-pointer"
              onClick={() => handleSort("name")}
              data-testid="sort-name-header"
            >
              Name{getSortIndicator("name")}
            </th>
            <th
              className="px-4 py-2 text-left cursor-pointer"
              onClick={() => handleSort("currency_code")}
              data-testid="sort-currency-header"
            >
              Currency{getSortIndicator("currency_code")}
            </th>
            <th
              className="px-4 py-2 text-right cursor-pointer"
              onClick={() => handleSort("balance")}
              data-testid="sort-balance-header"
            >
              Balance{getSortIndicator("balance")}
            </th>
            <th
              className="px-4 py-2 text-left cursor-pointer"
              onClick={() => handleSort("created_at")}
              data-testid="sort-created-header"
            >
              Created{getSortIndicator("created_at")}
            </th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedAccounts.map((account) => (
            <tr key={account.id} className="border-b hover:bg-gray-50" data-testid={`account-row-${account.id}`}>
              <td className="px-4 py-2" data-testid={`account-name-${account.id}`}>
                {account.name || ""}
              </td>
              <td className="px-4 py-2" data-testid={`account-currency-${account.id}`}>
                {account.currency_code || ""}
              </td>
              <td className="px-4 py-2 text-right" data-testid={`account-balance-${account.id}`}>
                {(account.balance || 0).toFixed(2)}
              </td>
              <td className="px-4 py-2" data-testid={`account-created-${account.id}`}>
                {account.created_at ? new Date(account.created_at).toLocaleDateString() : ""}
              </td>
              <td className="px-4 py-2 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(account)}
                  className="mr-0"
                  aria-label={`Edit ${account.name}`}
                  data-testid={`edit-account-${account.id}`}
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
                  onClick={() => onDelete(account)}
                  disabled={!account.active}
                  className={`text-red-600 hover:text-red-800 hover:bg-red-50 ${!account.active ? "opacity-50 cursor-not-allowed" : ""}`}
                  aria-label={`Delete ${account.name}`}
                  data-testid={`delete-account-${account.id}`}
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

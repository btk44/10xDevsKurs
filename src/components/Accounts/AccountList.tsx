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
      <div className="text-center py-8 border rounded-lg bg-gray-50">
        <p className="text-gray-500">No accounts found. Create your first account above.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" role="table">
        <thead>
          <tr className="bg-gray-100 border-b">
            <th className="px-4 py-2 text-left cursor-pointer" onClick={() => handleSort("name")}>
              Name{getSortIndicator("name")}
            </th>
            <th className="px-4 py-2 text-left cursor-pointer" onClick={() => handleSort("currency_code")}>
              Currency{getSortIndicator("currency_code")}
            </th>
            <th className="px-4 py-2 text-right cursor-pointer" onClick={() => handleSort("balance")}>
              Balance{getSortIndicator("balance")}
            </th>
            <th className="px-4 py-2 text-left cursor-pointer" onClick={() => handleSort("created_at")}>
              Created{getSortIndicator("created_at")}
            </th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedAccounts.map((account) => (
            <tr key={account.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-2">{account.name || ""}</td>
              <td className="px-4 py-2">{account.currency_code || ""}</td>
              <td className="px-4 py-2 text-right">{(account.balance || 0).toFixed(2)}</td>
              <td className="px-4 py-2">
                {account.created_at ? new Date(account.created_at).toLocaleDateString() : ""}
              </td>
              <td className="px-4 py-2 text-right space-x-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(account)}>
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(account)}
                  disabled={!account.active}
                  className={!account.active ? "opacity-50 cursor-not-allowed" : ""}
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

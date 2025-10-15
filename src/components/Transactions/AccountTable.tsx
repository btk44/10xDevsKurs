import type { AccountDTO } from "../../types";

interface AccountTableProps {
  accounts: AccountDTO[];
}

/**
 * AccountTable component
 * Displays a list of user accounts with their balances
 */
export default function AccountTable({ accounts }: AccountTableProps) {
  // Format amount for display
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Calculate total balance in primary currency (first account's currency)
  const calculateTotalBalance = () => {
    if (accounts.length === 0) return null;

    // Group accounts by currency
    const byCurrency = accounts.reduce<Record<string, { total: number; code: string }>>((acc, account) => {
      if (!acc[account.currency_code]) {
        acc[account.currency_code] = {
          total: 0,
          code: account.currency_code,
        };
      }
      acc[account.currency_code].total += account.balance;
      return acc;
    }, {});

    // Return array of totals by currency
    return Object.values(byCurrency).map(({ total, code }) => ({
      total,
      code,
    }));
  };

  const totalsByCurrency = calculateTotalBalance();

  // Handle empty state
  if (accounts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center" data-testid="account-table-empty">
        <h3 className="text-lg font-medium mb-2">No accounts found</h3>
        <p className="text-gray-500">Create an account to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden" data-testid="account-table">
      <div className="overflow-x-auto">
        <table className="w-full" data-testid="account-table-element">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-2 text-left">Account</th>
              <th className="px-4 py-2 text-right">Balance</th>
              <th className="px-4 py-2 text-left">Currency</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id} className="border-b" data-testid={`account-row-${account.id}`}>
                <td className="px-4 py-2">{account.name}</td>
                <td className="px-4 py-2 text-right">{formatAmount(account.balance)}</td>
                <td className="px-4 py-2">{account.currency_code}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            {totalsByCurrency?.map((total, index) => (
              <tr key={index} data-testid={`account-total-${total.code}`}>
                <td className="px-4 py-2 font-medium">Total</td>
                <td className="px-4 py-2 text-right font-medium">{formatAmount(total.total)}</td>
                <td className="px-4 py-2">{total.code}</td>
              </tr>
            ))}
          </tfoot>
        </table>
      </div>
    </div>
  );
}

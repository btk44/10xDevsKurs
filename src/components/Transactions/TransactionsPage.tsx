import { useState } from "react";
import type {
  GetTransactionsQuery,
  SortOption,
  TransactionDTO,
  CreateTransactionCommand,
  UpdateTransactionCommand,
} from "../../types";
import { useTransactions, useAccounts, useCategories, useTransactionMutations } from "./hooks";
import TransactionTable from "./TransactionTable";
import TransactionForm from "./TransactionForm";
import AccountTable from "./AccountTable";
import FilterModal from "./FilterModal";
import { Button } from "../ui/button";

/**
 * Main Transactions Page component
 * Orchestrates data fetching, state management, and layout for the transactions view
 */
export default function TransactionsPage() {
  // State for filters, pagination, and sorting
  const [filters, setFilters] = useState<GetTransactionsQuery>({
    page: 1,
    limit: 10,
    sort: "transaction_date:desc" as SortOption,
    include_inactive: false,
  });

  // State for selected transaction (for editing)
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDTO | null>(null);

  // State for filter modal visibility
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Fetch transactions based on current filters
  const {
    data: transactions,
    pagination,
    isLoading: transactionsLoading,
    error: transactionsError,
    refreshData: refreshTransactions,
  } = useTransactions(filters);

  // Fetch accounts for form and filtering
  const {
    data: accounts,
    isLoading: accountsLoading,
    error: accountsError,
    refreshData: refreshAccounts,
  } = useAccounts();

  // Fetch categories for form and filtering
  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useCategories();

  // Get transaction mutations
  const {
    createTransaction,
    updateTransaction,
    deleteTransaction,
    isLoading: mutationLoading,
    error: mutationError,
  } = useTransactionMutations();

  // Handle page change in pagination
  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  // Handle sort change in table
  const handleSortChange = (sort: SortOption) => {
    setFilters((prev) => ({ ...prev, sort, page: 1 }));
  };

  // Handle row double click to edit transaction
  const handleRowDoubleClick = (transaction: TransactionDTO) => {
    setSelectedTransaction(transaction);
  };

  // Handle form submission (create or update)
  const handleFormSubmit = async (data: CreateTransactionCommand | UpdateTransactionCommand) => {
    if (selectedTransaction) {
      // Update existing transaction
      const result = await updateTransaction(selectedTransaction.id, data as UpdateTransactionCommand);
      if (result) {
        // Refresh transactions and accounts data
        await Promise.all([refreshTransactions(), refreshAccounts()]);
        // Reset form
        setSelectedTransaction(null);
      }
    } else {
      // Create new transaction
      const result = await createTransaction(data as CreateTransactionCommand);
      if (result) {
        // Refresh transactions and accounts data
        await Promise.all([refreshTransactions(), refreshAccounts()]);
        // Reset form
        setSelectedTransaction(null);
      }
    }
  };

  // Handle form cancel
  const handleFormCancel = () => {
    setSelectedTransaction(null);
  };

  // Handle transaction deletion
  const handleDeleteTransaction = async (id: number) => {
    const success = await deleteTransaction(id);
    if (success) {
      // Refresh transactions and accounts data
      await Promise.all([refreshTransactions(), refreshAccounts()]);
      // Reset form
      setSelectedTransaction(null);
    }
  };

  // Handle filter apply
  const handleFilterApply = (newFilters: GetTransactionsQuery) => {
    setFilters({ ...newFilters, page: 1 }); // Reset to first page on filter change
    setShowFilterModal(false);
  };

  // Handle filter cancel
  const handleFilterCancel = () => {
    setShowFilterModal(false);
  };

  // Loading state
  const isLoading = transactionsLoading || accountsLoading || categoriesLoading || mutationLoading;

  // Error state
  const hasError = transactionsError || accountsError || categoriesError || mutationError;

  if (hasError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-lg font-semibold text-red-600 mb-2">Error loading data</h2>
        <p className="text-red-700 mb-4">
          {transactionsError?.message || accountsError?.message || categoriesError?.message || mutationError?.message}
        </p>
        <Button onClick={() => window.location.reload()} variant="destructive">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <Button onClick={() => setShowFilterModal(true)} variant="outline">
          Filter
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500">Loading data...</p>
          </div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <h3 className="text-lg font-medium mb-2">No transactions found</h3>
          <p className="text-gray-500 mb-4">
            {filters.date_from || filters.date_to || filters.account_id || filters.category_id || filters.search
              ? "Try adjusting your filters or add a new transaction."
              : "Start by adding your first transaction."}
          </p>
          <Button onClick={() => setFilters({ page: 1, limit: 10, sort: "transaction_date:desc" as SortOption })}>
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="lg:grid lg:grid-cols-5 lg:gap-4">
          {/* Left Column (3/5) */}
          <div className="mb-4 lg:mb-0 lg:col-span-3">
            <TransactionTable
              transactions={transactions}
              pagination={pagination}
              sort={filters.sort as SortOption}
              onPageChange={handlePageChange}
              onSortChange={handleSortChange}
              onRowDoubleClick={handleRowDoubleClick}
            />

            <div className="mt-6">
              <TransactionForm
                accounts={accounts}
                categories={categories}
                initialData={selectedTransaction}
                onSubmit={handleFormSubmit}
                onCancel={handleFormCancel}
                onDelete={selectedTransaction ? handleDeleteTransaction : undefined}
              />
            </div>
          </div>

          {/* Right Column (2/5) */}
          <div className="lg:col-span-2">
            <AccountTable accounts={accounts} />
          </div>
        </div>
      )}

      {showFilterModal && (
        <FilterModal
          isOpen={showFilterModal}
          initialFilters={filters}
          accounts={accounts}
          categories={categories}
          onApply={handleFilterApply}
          onCancel={handleFilterCancel}
        />
      )}
    </div>
  );
}

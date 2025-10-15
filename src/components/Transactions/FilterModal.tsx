import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import type { AccountDTO, CategoryDTO, GetTransactionsQuery } from "../../types";

interface FilterModalProps {
  isOpen: boolean;
  initialFilters: GetTransactionsQuery;
  accounts?: AccountDTO[];
  categories?: CategoryDTO[];
  onApply: (filters: GetTransactionsQuery) => void;
  onCancel: () => void;
}

interface FilterErrors {
  date_from?: string;
  date_to?: string;
  search?: string;
}

/**
 * FilterModal component
 * Dialog for setting filter criteria for transactions
 */
export default function FilterModal({
  isOpen,
  initialFilters,
  accounts = [],
  categories = [],
  onApply,
  onCancel,
}: FilterModalProps) {
  // State for filter values
  const [filters, setFilters] = useState<GetTransactionsQuery>({
    ...initialFilters,
  });

  // Validation errors
  const [errors, setErrors] = useState<FilterErrors>({});

  // Reset filters when modal opens with new initialFilters
  useEffect(() => {
    setFilters({ ...initialFilters });
    setErrors({});
  }, [initialFilters, isOpen]);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    // Handle different input types
    if (type === "date") {
      setFilters((prev) => ({ ...prev, [name]: value || undefined }));
    } else if (name === "account_id" || name === "category_id") {
      const numValue = value ? parseInt(value, 10) : undefined;
      setFilters((prev) => ({ ...prev, [name]: numValue }));
    } else {
      setFilters((prev) => ({ ...prev, [name]: value || undefined }));
    }

    // Clear error for this field
    if (errors[name as keyof FilterErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Validate filters before applying
  const validateFilters = (): boolean => {
    const newErrors: FilterErrors = {};

    // Validate date range
    if (filters.date_from && filters.date_to) {
      if (new Date(filters.date_from) > new Date(filters.date_to)) {
        newErrors.date_from = "Start date must be before end date";
        newErrors.date_to = "End date must be after start date";
      }
    }

    // Validate search text length
    if (filters.search && filters.search.length > 100) {
      newErrors.search = "Search text must be 100 characters or less";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate a single field
  const validateField = (name: string, value: any): string | undefined => {
    // Date range validation
    if (name === "date_from" && filters.date_to && value) {
      if (new Date(value) > new Date(filters.date_to)) {
        return "Start date must be before end date";
      }
    }

    if (name === "date_to" && filters.date_from && value) {
      if (new Date(filters.date_from) > new Date(value)) {
        return "End date must be after start date";
      }
    }

    // Search text length validation
    if (name === "search" && value && value.length > 100) {
      return "Search text must be 100 characters or less";
    }

    return undefined;
  };

  // Handle field blur for validation
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const errorMessage = validateField(name, value);

    setErrors((prev) => ({
      ...prev,
      [name]: errorMessage,
    }));
  };

  // Handle apply button click
  const handleApply = () => {
    if (validateFilters()) {
      onApply(filters);
    }
  };

  // Handle reset button click
  const handleReset = () => {
    setFilters({
      page: 1,
      limit: initialFilters.limit || 10,
      sort: initialFilters.sort || "transaction_date:desc",
    });
    setErrors({});
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[500px]" data-testid="filter-modal">
        <DialogHeader>
          <DialogTitle data-testid="filter-modal-title">Filter Transactions</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="date_from" className="block text-sm font-medium mb-1">
                From Date
              </label>
              <input
                type="date"
                id="date_from"
                name="date_from"
                value={filters.date_from || ""}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full p-2 border rounded-md ${errors.date_from ? "border-red-500" : "border-gray-300"}`}
                data-testid="filter-date-from-input"
              />
              {errors.date_from && <p className="text-red-500 text-xs mt-1">{errors.date_from}</p>}
            </div>

            <div>
              <label htmlFor="date_to" className="block text-sm font-medium mb-1">
                To Date
              </label>
              <input
                type="date"
                id="date_to"
                name="date_to"
                value={filters.date_to || ""}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full p-2 border rounded-md ${errors.date_to ? "border-red-500" : "border-gray-300"}`}
                data-testid="filter-date-to-input"
              />
              {errors.date_to && <p className="text-red-500 text-xs mt-1">{errors.date_to}</p>}
            </div>
          </div>

          {/* Account and Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="account_id" className="block text-sm font-medium mb-1">
                Account
              </label>
              <select
                id="account_id"
                name="account_id"
                value={filters.account_id || ""}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                data-testid="filter-account-select"
              >
                <option value="">All Accounts</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="category_id" className="block text-sm font-medium mb-1">
                Category
              </label>
              <select
                id="category_id"
                name="category_id"
                value={filters.category_id || ""}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                data-testid="filter-category-select"
              >
                <option value="">All Categories</option>
                <optgroup label="Income">
                  {categories
                    .filter((c) => c.category_type === "income")
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Expense">
                  {categories
                    .filter((c) => c.category_type === "expense")
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Search Text */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              name="search"
              value={filters.search || ""}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Search in comments..."
              maxLength={100}
              className={`w-full p-2 border rounded-md ${errors.search ? "border-red-500" : "border-gray-300"}`}
              data-testid="filter-search-input"
            />
            {errors.search && <p className="text-red-500 text-xs mt-1">{errors.search}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleReset} type="button" data-testid="filter-reset-button">
            Reset
          </Button>
          <Button variant="outline" onClick={onCancel} type="button" data-testid="filter-cancel-button">
            Cancel
          </Button>
          <Button onClick={handleApply} type="button" data-testid="filter-apply-button">
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

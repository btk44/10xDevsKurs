import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import type {
  AccountDTO,
  CategoryDTO,
  CreateTransactionCommand,
  TransactionDTO,
  UpdateTransactionCommand,
} from "../../types";

interface TransactionFormProps {
  accounts: AccountDTO[];
  categories: CategoryDTO[];
  initialData?: TransactionDTO | null;
  onSubmit: (data: CreateTransactionCommand | UpdateTransactionCommand) => void;
  onCancel: () => void;
  onDelete?: (id: number) => void;
}

interface FormErrors {
  transaction_date?: string;
  account_id?: string;
  category_id?: string;
  amount?: string;
  comment?: string;
}

/**
 * TransactionForm component
 * Form for creating or editing a transaction
 */
export default function TransactionForm({
  accounts,
  categories,
  initialData,
  onSubmit,
  onCancel,
  onDelete,
}: TransactionFormProps) {
  // Form state
  const [formData, setFormData] = useState<CreateTransactionCommand>({
    transaction_date: new Date().toISOString().split("T")[0],
    account_id: 0,
    category_id: 0,
    amount: 0,
    currency_id: accounts.length > 0 && accounts[0].currency_id ? accounts[0].currency_id : 1,
    comment: "",
  });

  // Form validation errors
  const [errors, setErrors] = useState<FormErrors>({});

  // Set initial form data when editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        transaction_date: initialData.transaction_date.split("T")[0],
        account_id: initialData.account_id,
        category_id: initialData.category_id,
        amount: initialData.amount,
        currency_id: initialData.currency_id,
        comment: initialData.comment || "",
      });
    } else {
      // Reset form when not editing
      setFormData({
        transaction_date: new Date().toISOString().split("T")[0],
        account_id: 0,
        category_id: 0,
        amount: 0,
        currency_id: accounts.length > 0 && accounts[0].currency_id ? accounts[0].currency_id : 1,
        comment: "",
      });
    }
  }, [initialData, accounts, categories]);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    let parsedValue: string | number = value;

    // Parse numeric values
    if (name === "amount" || name === "account_id" || name === "category_id") {
      parsedValue = parseFloat(value);

      // Handle NaN for amount
      if (name === "amount" && isNaN(parsedValue)) {
        parsedValue = 0;
      }
    }

    // Update currency_id when account_id changes
    if (name === "account_id" && parsedValue) {
      const selectedAccount = accounts.find((acc) => acc.id === Number(parsedValue));
      const numericValue = Number(parsedValue);

      setFormData((prev) => ({
        ...prev,
        [name]: numericValue,
        currency_id: selectedAccount ? selectedAccount.currency_id : prev.currency_id,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: parsedValue,
      }));
    }

    // Clear error for this field
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  // Validate form data
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.transaction_date) {
      newErrors.transaction_date = "Date is required";
    }

    if (!formData.account_id) {
      newErrors.account_id = "Account is required";
    }

    if (!formData.category_id) {
      newErrors.category_id = "Category is required";
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = "Amount must be greater than 0";
    }

    // Comment length validation
    if (formData.comment && formData.comment.length > 255) {
      newErrors.comment = "Comment must be less than 255 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate form field on blur
  const validateField = (name: string, value: string | number): string | undefined => {
    switch (name) {
      case "transaction_date":
        return !value ? "Date is required" : undefined;
      case "account_id":
        return !value ? "Account is required" : undefined;
      case "category_id":
        return !value ? "Category is required" : undefined;
      case "amount":
        return !value || Number(value) <= 0 ? "Amount must be greater than 0" : undefined;
      case "comment":
        return typeof value === "string" && value.length > 255 ? "Comment must be less than 255 characters" : undefined;
      default:
        return undefined;
    }
  };

  // Handle input blur for field-level validation
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const errorMessage = validateField(name, value);

    setErrors((prev) => ({
      ...prev,
      [name]: errorMessage,
    }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const zeroPad = (num: number, places: number) => String(num).padStart(places, "0");

    if (validateForm()) {
      // Add time part to transaction_date to make it ISO format
      const initialDate = initialData?.transaction_date ? new Date(initialData.transaction_date) : new Date();
      const transDate = `${formData.transaction_date}T${zeroPad(initialDate.getHours(), 2)}:${zeroPad(initialDate.getMinutes(), 2)}:${zeroPad(initialDate.getSeconds(), 2)}Z`;
      const formattedData = {
        ...formData,
        transaction_date: transDate,
        // Ensure currency_id is set if account_id is provided
        currency_id:
          formData.currency_id ||
          (formData.account_id ? accounts.find((acc) => acc.id === formData.account_id)?.currency_id || 1 : 1),
        // Ensure comment is never null
        comment: formData.comment || "",
      };
      onSubmit(formattedData);
    }
  };

  // Handle delete button click
  const handleDelete = () => {
    if (initialData && onDelete) {
      onDelete(initialData.id);
    }
  };

  // Filter categories by type
  const incomeCategories = categories.filter((c) => c.category_type === "income");
  const expenseCategories = categories.filter((c) => c.category_type === "expense");

  return (
    <div className="bg-white rounded-lg shadow p-6" data-testid="transaction-form">
      <h2 className="text-xl font-semibold mb-4" data-testid="transaction-form-title">
        {initialData ? "Edit Transaction" : "New Transaction"}
      </h2>

      <form onSubmit={handleSubmit} data-testid="transaction-form-element">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Date Field */}
          <div>
            <label htmlFor="transaction_date" className="block text-sm font-medium mb-1">
              Date *
            </label>
            <input
              type="date"
              id="transaction_date"
              name="transaction_date"
              value={formData.transaction_date}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full p-2 border rounded-md ${
                errors.transaction_date ? "border-red-500" : "border-gray-300"
              }`}
              required
              data-testid="transaction-date-input"
            />
            {errors.transaction_date && <p className="text-red-500 text-xs mt-1">{errors.transaction_date}</p>}
          </div>

          {/* Account Field */}
          <div>
            <label htmlFor="account_id" className="block text-sm font-medium mb-1">
              Account *
            </label>
            <select
              id="account_id"
              name="account_id"
              value={formData.account_id || ""}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full p-2 border rounded-md ${errors.account_id ? "border-red-500" : "border-gray-300"}`}
              required
              data-testid="transaction-account-select"
            >
              <option value="">Select Account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.currency_code})
                </option>
              ))}
            </select>
            {errors.account_id && <p className="text-red-500 text-xs mt-1">{errors.account_id}</p>}
          </div>

          {/* Category Field */}
          <div>
            <label htmlFor="category_id" className="block text-sm font-medium mb-1">
              Category *
            </label>
            <select
              id="category_id"
              name="category_id"
              value={formData.category_id || ""}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full p-2 border rounded-md ${errors.category_id ? "border-red-500" : "border-gray-300"}`}
              required
              data-testid="transaction-category-select"
            >
              <option value="">Select Category</option>

              <optgroup label="Income">
                {incomeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </optgroup>

              <optgroup label="Expense">
                {expenseCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </optgroup>
            </select>
            {errors.category_id && <p className="text-red-500 text-xs mt-1">{errors.category_id}</p>}
          </div>

          {/* Amount Field */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium mb-1">
              Amount *
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              onBlur={handleBlur}
              step="0.01"
              min="0.01"
              className={`w-full p-2 border rounded-md ${errors.amount ? "border-red-500" : "border-gray-300"}`}
              required
              data-testid="transaction-amount-input"
            />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
          </div>

          {/* Comment Field */}
          <div className="md:col-span-2 lg:col-span-4">
            <label htmlFor="comment" className="block text-sm font-medium mb-1">
              Comment
            </label>
            <input
              type="text"
              id="comment"
              name="comment"
              value={formData.comment || ""}
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={255}
              className={`w-full p-2 border rounded-md ${errors.comment ? "border-red-500" : "border-gray-300"}`}
              data-testid="transaction-comment-input"
            />
            {errors.comment && <p className="text-red-500 text-xs mt-1">{errors.comment}</p>}
          </div>
        </div>

        <div className="flex justify-between">
          <div>
            <Button type="submit" variant="default" data-testid="transaction-submit-button">
              {initialData ? "Update" : "Save"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="ml-2"
              onClick={onCancel}
              data-testid="transaction-cancel-button"
            >
              Cancel
            </Button>
          </div>

          {initialData && onDelete && (
            <Button type="button" variant="destructive" onClick={handleDelete} data-testid="transaction-delete-button">
              Delete
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

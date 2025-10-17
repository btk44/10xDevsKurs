import { useState, useEffect } from "react";
import type {
  AccountDTO,
  CurrencyDTO,
  CreateAccountCommand,
  UpdateAccountCommand,
  ValidationErrorDetail,
} from "../../types";
import { Button } from "../ui/button";

interface AccountFormProps {
  account: AccountDTO | null;
  currencies: CurrencyDTO[];
  onSave: (command: CreateAccountCommand | UpdateAccountCommand) => void;
  onCancel: () => void;
  errors?: ValidationErrorDetail[];
  isSaving: boolean;
}

export default function AccountForm({
  account,
  currencies,
  onSave,
  onCancel,
  errors = [],
  isSaving,
}: AccountFormProps) {
  const [formData, setFormData] = useState<CreateAccountCommand>({
    name: "",
    currency_id: 0,
    tag: null,
  });

  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  // Reset form when account changes (edit mode or cancel)
  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name,
        currency_id: account.currency_id,
        tag: account.tag,
      });
    } else {
      setFormData({
        name: "",
        currency_id: currencies.length > 0 ? currencies[0].id : 0,
        tag: null,
      });
    }
    setLocalErrors({});
  }, [account, currencies]);

  // Map API errors to form fields
  useEffect(() => {
    const errorMap: Record<string, string> = {};
    errors.forEach((error) => {
      errorMap[error.field] = error.message;
    });
    setLocalErrors(errorMap);
  }, [errors]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name === "currency_id" ? Number(value) : value,
    }));

    // Clear local error when field is edited
    if (localErrors[name]) {
      setLocalErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.length > 100) {
      newErrors.name = "Name must be 100 characters or less";
    }

    // Validate currency
    if (!formData.currency_id) {
      newErrors.currency_id = "Currency is required";
    }

    // Validate tag
    if (formData.tag && formData.tag.length > 10) {
      newErrors.tag = "Tag must be 10 characters or less";
    }

    setLocalErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Convert null tag to empty string before saving
    const dataToSave = {
      ...formData,
      tag: formData.tag || "",
    };

    onSave(dataToSave);
  };

  // Allow submission even when invalid so validation can run and show errors
  const isFormValid = true;
  const isEditing = !!account;

  return (
    <div className="bg-white p-6 rounded-lg border shadow-sm" data-testid="account-form-container">
      <h2 className="text-xl font-semibold mb-4" data-testid="account-form-title">
        {isEditing ? "Edit Account" : "Create New Account"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4" data-testid="account-form">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Account Name *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md ${localErrors.name ? "border-red-500" : "border-gray-300"}`}
            aria-invalid={!!localErrors.name}
            aria-describedby={localErrors.name ? "name-error" : undefined}
            data-testid="account-name-input"
          />
          {localErrors.name && (
            <p id="name-error" className="mt-1 text-sm text-red-600" data-testid="account-name-error">
              {localErrors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="currency_id" className="block text-sm font-medium mb-1">
            Currency *
          </label>
          <select
            id="currency_id"
            name="currency_id"
            value={formData.currency_id}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md ${
              localErrors.currency_id ? "border-red-500" : "border-gray-300"
            }`}
            aria-invalid={!!localErrors.currency_id}
            aria-describedby={localErrors.currency_id ? "currency-error" : undefined}
            data-testid="account-currency-select"
          >
            <option value="">Select Currency</option>
            {currencies.map((currency) => (
              <option key={currency.id} value={currency.id} data-testid={`currency-option-${currency.id}`}>
                {currency.code} - {currency.description}
              </option>
            ))}
          </select>
          {localErrors.currency_id && (
            <p id="currency-error" className="mt-1 text-sm text-red-600" data-testid="account-currency-error">
              {localErrors.currency_id}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="tag" className="block text-sm font-medium mb-1">
            Tag (Optional)
          </label>
          <input
            id="tag"
            name="tag"
            type="text"
            value={formData.tag || ""}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md ${localErrors.tag ? "border-red-500" : "border-gray-300"}`}
            maxLength={10}
            aria-invalid={!!localErrors.tag}
            aria-describedby={localErrors.tag ? "tag-error" : undefined}
            data-testid="account-tag-input"
          />
          {localErrors.tag && (
            <p id="tag-error" className="mt-1 text-sm text-red-600" data-testid="account-tag-error">
              {localErrors.tag}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">Max 10 characters</p>
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} data-testid="account-cancel-button">
            Cancel
          </Button>
          <Button type="submit" disabled={!isFormValid || isSaving} data-testid="account-submit-button">
            {isSaving ? "Saving..." : isEditing ? "Update Account" : "Create Account"}
          </Button>
        </div>
      </form>
    </div>
  );
}

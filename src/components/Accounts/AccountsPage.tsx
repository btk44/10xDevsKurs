import { useState, useEffect } from "react";
import type {
  AccountDTO,
  CurrencyDTO,
  CreateAccountCommand,
  UpdateAccountCommand,
  ValidationErrorDetail,
} from "../../types";
import AccountList from "./AccountList";
import AccountForm from "./AccountForm";
import DeleteConfirmationModal from "./DeleteConfirmationModal";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountDTO[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyDTO[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AccountDTO | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<AccountDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formErrors, setFormErrors] = useState<ValidationErrorDetail[]>([]);

  // Fetch accounts on mount
  useEffect(() => {
    fetchAccounts();
    fetchCurrencies();
  }, []);

  async function fetchAccounts() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/accounts");
      if (!response.ok) {
        throw new Error("Failed to fetch accounts");
      }
      const data = await response.json();
      setAccounts(data.data);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      // TODO: Show error toast
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchCurrencies() {
    try {
      const response = await fetch("/api/currencies");
      if (!response.ok) {
        throw new Error("Failed to fetch currencies");
      }
      const data = await response.json();
      setCurrencies(data.data);
    } catch (error) {
      console.error("Error fetching currencies:", error);
      // TODO: Show error toast
    }
  }

  async function handleSave(command: CreateAccountCommand | UpdateAccountCommand) {
    setIsSaving(true);
    setFormErrors([]);

    try {
      let response;

      if (selectedAccount) {
        // Update existing account
        response = await fetch(`/api/accounts/${selectedAccount.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(command),
        });
      } else {
        // Create new account
        response = await fetch("/api/accounts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(command),
        });
      }

      if (response.status === 400) {
        // Validation error
        const errorData = await response.json();
        setFormErrors(errorData.error.details || []);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to save account");
      }

      // Success - clear form and refetch accounts
      setSelectedAccount(null);
      fetchAccounts();
    } catch (error) {
      console.error("Error saving account:", error);
      // TODO: Show error toast
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmDelete(id: number) {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/accounts/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete account");
      }

      // Success - close modal and refetch accounts
      setAccountToDelete(null);
      fetchAccounts();
    } catch (error) {
      console.error("Error deleting account:", error);
      // TODO: Show error toast
    } finally {
      setIsDeleting(false);
    }
  }

  function handleEdit(account: AccountDTO) {
    setSelectedAccount(account);
    setFormErrors([]);
  }

  function handleDelete(account: AccountDTO) {
    setAccountToDelete(account);
  }

  function handleCancelForm() {
    setSelectedAccount(null);
    setFormErrors([]);
  }

  function handleCloseModal() {
    setAccountToDelete(null);
  }

  return (
    <div className="space-y-8" data-testid="accounts-page-container">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="text-center py-8" data-testid="accounts-loading">
              Loading accounts...
            </div>
          ) : (
            <AccountList accounts={accounts} onEdit={handleEdit} onDelete={handleDelete} />
          )}
        </div>

        <div className="lg:col-span-1">
          <AccountForm
            account={selectedAccount}
            currencies={currencies}
            onSave={handleSave}
            onCancel={handleCancelForm}
            errors={formErrors}
            isSaving={isSaving}
          />
        </div>
      </div>

      {accountToDelete && (
        <DeleteConfirmationModal
          account={accountToDelete}
          onConfirm={handleConfirmDelete}
          onClose={handleCloseModal}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}

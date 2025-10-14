import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "../../../../tests/utils";
import userEvent from "@testing-library/user-event";
import AccountsPage from "../AccountsPage";
import type { AccountDTO, CurrencyDTO, CreateAccountCommand, UpdateAccountCommand } from "../../../types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockAccounts: AccountDTO[] = [
  {
    id: 1,
    user_id: "user123",
    name: "Savings Account",
    currency_id: 1,
    currency_code: "USD",
    balance: 1500.5,
    tag: "savings",
    active: true,
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
  },
  {
    id: 2,
    user_id: "user123",
    name: "Checking Account",
    currency_id: 1,
    currency_code: "USD",
    balance: 750.25,
    tag: "checking",
    active: true,
    created_at: "2024-01-10T10:00:00Z",
    updated_at: "2024-01-10T10:00:00Z",
  },
];

const mockCurrencies: CurrencyDTO[] = [
  { id: 1, code: "USD", description: "US Dollar", active: true },
  { id: 2, code: "EUR", description: "Euro", active: true },
];

describe("AccountsPage", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: [] }),
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initial Loading", () => {
    it("shows loading state initially", () => {
      render(<AccountsPage />);

      expect(screen.getByText("Loading accounts...")).toBeInTheDocument();
    });

    it("fetches accounts and currencies on mount", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: mockAccounts }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: mockCurrencies }),
        } as Response);

      render(<AccountsPage />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/accounts");
        expect(mockFetch).toHaveBeenCalledWith("/api/currencies");
      });

      await waitFor(() => {
        expect(screen.getByText("Savings Account")).toBeInTheDocument();
        expect(screen.getByText("Checking Account")).toBeInTheDocument();
      });
    });

    it("handles fetch errors gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<AccountsPage />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith("Error fetching accounts:", expect.any(Error));
      });

      // Should still render the form and list (with empty accounts)
      expect(screen.getByText("No accounts found. Create your first account above.")).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe("Account Creation", () => {
    beforeEach(() => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: mockAccounts }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: mockCurrencies }),
        } as Response);
    });

    it("creates new account successfully", async () => {
      const newAccount = {
        name: "New Account",
        currency_id: 1,
        tag: "new",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: vi.fn().mockResolvedValue({}),
      } as Response);

      // Mock the refetch after creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: [...mockAccounts, { ...newAccount, id: 3 }] }),
      } as Response);

      render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText("Savings Account")).toBeInTheDocument();
      });

      // Fill out the form
      const nameInput = screen.getByLabelText(/account name/i);
      const currencySelect = screen.getByLabelText(/currency/i);
      const tagInput = screen.getByLabelText(/tag/i);

      await user.type(nameInput, "New Account");
      await user.selectOptions(currencySelect, "1");
      await user.type(tagInput, "new");

      const createButton = screen.getByRole("button", { name: /create account/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/accounts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newAccount),
        });
      });
    });

    it("handles validation errors during creation", async () => {
      const validationErrors = [
        { field: "name", message: "Name already exists" },
        { field: "currency_id", message: "Invalid currency" },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({
          error: { details: validationErrors },
        }),
      } as Response);

      render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText("Savings Account")).toBeInTheDocument();
      });

      // Fill out and submit form
      const nameInput = screen.getByLabelText(/account name/i);
      const currencySelect = screen.getByLabelText(/currency/i);

      await user.type(nameInput, "Duplicate Name");
      await user.selectOptions(currencySelect, "1");

      const createButton = screen.getByRole("button", { name: /create account/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText("Name already exists")).toBeInTheDocument();
        expect(screen.getByText("Invalid currency")).toBeInTheDocument();
      });
    });
  });

  describe("Account Editing", () => {
    beforeEach(() => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: mockAccounts }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: mockCurrencies }),
        } as Response);
    });

    it("enters edit mode when edit button is clicked", async () => {
      render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText("Savings Account")).toBeInTheDocument();
      });

      const editButton = screen.getAllByRole("button", { name: /edit/i })[0];
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByText("Edit Account")).toBeInTheDocument();
      });

      // Form should be populated with account data
      const nameInput = screen.getByLabelText(/account name/i);
      expect(nameInput).toHaveValue("Checking Account"); // First account in sorted list
    });

    it("updates account successfully", async () => {
      const updatedAccount = {
        name: "Updated Checking Account",
        currency_id: 1,
        tag: "checking",
      };

      // Setup mocks: initial load, currencies, update, refetch
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: mockAccounts }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: mockCurrencies }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({}),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            data: [{ ...mockAccounts[1], name: "Updated Checking Account" }, mockAccounts[0]],
          }),
        } as Response);

      render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText("Checking Account")).toBeInTheDocument();
      });

      // Enter edit mode - click first edit button (Checking Account)
      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      await user.click(editButtons[0]);

      // Update the name
      const nameInput = screen.getByLabelText(/account name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Updated Checking Account");

      const updateButton = screen.getByRole("button", { name: /update account/i });
      await user.click(updateButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(`/api/accounts/${mockAccounts[1].id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedAccount),
        });
      });
    });

    it("exits edit mode when cancel is clicked", async () => {
      render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText("Savings Account")).toBeInTheDocument();
      });

      // Enter edit mode
      const editButton = screen.getAllByRole("button", { name: /edit/i })[0];
      await user.click(editButton);

      expect(screen.getByText("Edit Account")).toBeInTheDocument();

      // Cancel
      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByText("Create New Account")).toBeInTheDocument();
      });
    });
  });

  describe("Account Deletion", () => {
    beforeEach(() => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: mockAccounts }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: mockCurrencies }),
        } as Response);
    });

    it("shows delete confirmation modal when delete is clicked", async () => {
      render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText("Savings Account")).toBeInTheDocument();
      });

      const deleteButton = screen.getAllByRole("button", { name: /delete/i })[0];
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Delete Account" })).toBeInTheDocument();
        expect(screen.getByText('Are you sure you want to delete the account "Checking Account"?')).toBeInTheDocument();
      });

      // Close modal when cancel is clicked
      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("deletes account successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: vi.fn().mockResolvedValue({}),
      } as Response);

      // Mock the refetch after deletion
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: [mockAccounts[1]] }), // Only checking account remains
      } as Response);

      render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText("Savings Account")).toBeInTheDocument();
      });

      // Click delete and confirm
      const deleteButton = screen.getAllByRole("button", { name: /delete/i })[0];
      await user.click(deleteButton);

      const confirmDeleteButton = screen.getByRole("button", { name: /delete account/i });
      await user.click(confirmDeleteButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(`/api/accounts/${mockAccounts[1].id}`, {
          method: "DELETE",
        });
      });

      // Modal should be closed
      await waitFor(() => {
        expect(screen.queryByText("Delete Account")).not.toBeInTheDocument();
      });
    });

    it("handles delete errors gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetch.mockRejectedValueOnce(new Error("Delete failed"));

      render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText("Savings Account")).toBeInTheDocument();
      });

      // Click delete and confirm
      const deleteButton = screen.getAllByRole("button", { name: /delete/i })[0];
      await user.click(deleteButton);

      const confirmDeleteButton = screen.getByRole("button", { name: /delete account/i });
      await user.click(confirmDeleteButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith("Error deleting account:", expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Loading States", () => {
    beforeEach(() => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: mockAccounts }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: mockCurrencies }),
        } as Response);
    });

    it("shows saving state during account creation", async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                status: 201,
                json: vi.fn().mockResolvedValue({}),
              } as Response);
            }, 100);
          })
      );

      render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText("Savings Account")).toBeInTheDocument();
      });

      // Fill and submit form
      const nameInput = screen.getByLabelText(/account name/i);
      const currencySelect = screen.getByLabelText(/currency/i);

      await user.type(nameInput, "New Account");
      await user.selectOptions(currencySelect, "1");

      const createButton = screen.getByRole("button", { name: /create account/i });
      await user.click(createButton);

      // Button should show loading state
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /saving/i })).toBeInTheDocument();
      });

      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByRole("button", { name: /saving/i })).not.toBeInTheDocument();
      });
    });

    it("shows deleting state during account deletion", async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                status: 204,
                json: vi.fn().mockResolvedValue({}),
              } as Response);
            }, 100);
          })
      );

      render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText("Savings Account")).toBeInTheDocument();
      });

      const deleteButton = screen.getAllByRole("button", { name: /delete/i })[0];
      await user.click(deleteButton);

      const confirmDeleteButton = screen.getByRole("button", { name: /delete account/i });
      await user.click(confirmDeleteButton);

      // Button should show loading state
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /deleting/i })).toBeInTheDocument();
      });

      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByRole("button", { name: /deleting/i })).not.toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: mockAccounts }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: mockCurrencies }),
        } as Response);
    });

    it("handles network errors during save operations", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText("Savings Account")).toBeInTheDocument();
      });

      // Try to create account
      const nameInput = screen.getByLabelText(/account name/i);
      const currencySelect = screen.getByLabelText(/currency/i);

      await user.type(nameInput, "New Account");
      await user.selectOptions(currencySelect, "1");

      const createButton = screen.getByRole("button", { name: /create account/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith("Error saving account:", expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it("handles non-200 responses during save operations", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({ error: "Internal server error" }),
      } as Response);

      render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText("Savings Account")).toBeInTheDocument();
      });

      // Try to create account
      const nameInput = screen.getByLabelText(/account name/i);
      const currencySelect = screen.getByLabelText(/currency/i);

      await user.type(nameInput, "New Account");
      await user.selectOptions(currencySelect, "1");

      const createButton = screen.getByRole("button", { name: /create account/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith("Error saving account:", expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe("State Coordination", () => {
    beforeEach(() => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: mockAccounts }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: mockCurrencies }),
        } as Response);
    });

    it("clears form errors when entering edit mode", async () => {
      render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText("Checking Account")).toBeInTheDocument();
      });

      // Enter edit mode - form should be populated and errors cleared
      const editButton = screen.getAllByRole("button", { name: /edit/i })[0];
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByText("Edit Account")).toBeInTheDocument();
        const nameInput = screen.getByLabelText(/account name/i);
        expect(nameInput).toHaveValue("Checking Account");
      });
    });

    it("shows form in create mode after successful operations", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: mockAccounts }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: mockCurrencies }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({}),
        } as Response);

      render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText("Checking Account")).toBeInTheDocument();
      });

      // Enter edit mode first
      const editButton = screen.getAllByRole("button", { name: /edit/i })[0];
      await user.click(editButton);

      expect(screen.getByText("Edit Account")).toBeInTheDocument();

      // Update should return to create mode
      const nameInput = screen.getByLabelText(/account name/i);
      const currencySelect = screen.getByLabelText(/currency/i);

      await user.clear(nameInput);
      await user.type(nameInput, "Updated Checking Account");
      await user.selectOptions(currencySelect, "1");

      const updateButton = screen.getByRole("button", { name: /update account/i });
      await user.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText("Create New Account")).toBeInTheDocument();
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles empty API responses", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: [] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: [] }),
        } as Response);

      render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText("No accounts found. Create your first account above.")).toBeInTheDocument();
      });
    });

    it("handles null or undefined account data", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: null }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: [] }),
        } as Response);

      render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText("Loading accounts...")).toBeInTheDocument();
      });

      // Component should handle null data gracefully without crashing
      await waitFor(
        () => {
          expect(screen.getByText("No accounts found. Create your first account above.")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("handles malformed API responses", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({}), // Missing data property
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: [] }),
        } as Response);

      render(<AccountsPage />);

      await waitFor(() => {
        expect(screen.getByText("Loading accounts...")).toBeInTheDocument();
      });

      // Component should handle malformed data gracefully
      await waitFor(
        () => {
          expect(screen.getByText("No accounts found. Create your first account above.")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });
});

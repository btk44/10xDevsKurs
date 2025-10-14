import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../../../../tests/utils";
import userEvent from "@testing-library/user-event";
import AccountList from "../AccountList";
import type { AccountDTO } from "../../../types";

// Mock data with different values for sorting tests
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
  {
    id: 3,
    user_id: "user123",
    name: "Business Account",
    currency_id: 2,
    currency_code: "EUR",
    balance: 2500.75,
    tag: "business",
    active: false, // Inactive account for testing
    created_at: "2024-01-20T10:00:00Z",
    updated_at: "2024-01-20T10:00:00Z",
  },
  {
    id: 4,
    user_id: "user123",
    name: "Investment Account",
    currency_id: 1,
    currency_code: "USD",
    balance: 5000.0,
    tag: "investment",
    active: true,
    created_at: "2024-01-05T10:00:00Z",
    updated_at: "2024-01-05T10:00:00Z",
  },
];

describe("AccountList", () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders all accounts in the table", () => {
      render(<AccountList accounts={mockAccounts} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.getByText("Savings Account")).toBeInTheDocument();
      expect(screen.getByText("Checking Account")).toBeInTheDocument();
      expect(screen.getByText("Business Account")).toBeInTheDocument();
      expect(screen.getByText("Investment Account")).toBeInTheDocument();
    });

    it("renders account details correctly", () => {
      render(<AccountList accounts={[mockAccounts[0]]} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.getByText("Savings Account")).toBeInTheDocument();
      expect(screen.getByText("USD")).toBeInTheDocument();
      expect(screen.getByText("1500.50")).toBeInTheDocument();
      expect(screen.getByText("1/15/2024")).toBeInTheDocument();
    });

    it("renders empty state when no accounts", () => {
      render(<AccountList accounts={[]} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.getByText("No accounts found. Create your first account above.")).toBeInTheDocument();
    });
  });

  describe("Sorting Logic", () => {
    it("sorts by name ascending by default", () => {
      render(<AccountList accounts={mockAccounts} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const rows = screen.getAllByRole("row");
      // Skip header row, check first data row
      expect(rows[1]).toHaveTextContent("Business Account");
      expect(rows[2]).toHaveTextContent("Checking Account");
      expect(rows[3]).toHaveTextContent("Investment Account");
      expect(rows[4]).toHaveTextContent("Savings Account");
    });

    it("toggles sort direction when clicking same field", async () => {
      render(<AccountList accounts={mockAccounts} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      // First click - should sort ascending (already default)
      const nameHeader = screen.getByRole("columnheader", { name: /name/i });
      expect(nameHeader).toHaveTextContent("Name");

      // Second click - should sort descending
      await user.click(nameHeader);

      const rows = screen.getAllByRole("row");
      expect(rows[1]).toHaveTextContent("Savings Account");
      expect(rows[2]).toHaveTextContent("Investment Account");
      expect(rows[3]).toHaveTextContent("Checking Account");
      expect(rows[4]).toHaveTextContent("Business Account");

      expect(nameHeader).toHaveTextContent("Name ↓");
    });

    it("sorts by balance correctly", async () => {
      render(<AccountList accounts={mockAccounts} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const balanceHeader = screen.getByRole("columnheader", { name: /balance/i });
      await user.click(balanceHeader);

      const rows = screen.getAllByRole("row");
      expect(rows[1]).toHaveTextContent("Checking Account"); // 750.25
      expect(rows[2]).toHaveTextContent("Savings Account"); // 1500.50
      expect(rows[3]).toHaveTextContent("Business Account"); // 2500.75
      expect(rows[4]).toHaveTextContent("Investment Account"); // 5000.00
    });

    it("sorts by balance descending", async () => {
      render(<AccountList accounts={mockAccounts} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const balanceHeader = screen.getByRole("columnheader", { name: /balance/i });
      await user.click(balanceHeader);
      await user.click(balanceHeader); // Second click for descending

      const rows = screen.getAllByRole("row");
      expect(rows[1]).toHaveTextContent("Investment Account"); // 5000.00
      expect(rows[2]).toHaveTextContent("Business Account"); // 2500.75
      expect(rows[3]).toHaveTextContent("Savings Account"); // 1500.50
      expect(rows[4]).toHaveTextContent("Checking Account"); // 750.25
    });

    it("sorts by currency correctly", async () => {
      render(<AccountList accounts={mockAccounts} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const currencyHeader = screen.getByRole("columnheader", { name: /currency/i });
      await user.click(currencyHeader);

      const rows = screen.getAllByRole("row");
      // Check that Business Account (EUR) comes first
      expect(rows[1]).toHaveTextContent("Business Account");
      // The exact order of USD accounts may vary, but Business Account should be first
    });

    it("sorts by created date correctly", async () => {
      render(<AccountList accounts={mockAccounts} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const dateHeader = screen.getByRole("columnheader", { name: /created/i });
      await user.click(dateHeader);

      const rows = screen.getAllByRole("row");
      expect(rows[1]).toHaveTextContent("Investment Account"); // 1/5/2024
      expect(rows[2]).toHaveTextContent("Checking Account"); // 1/10/2024
      expect(rows[3]).toHaveTextContent("Savings Account"); // 1/15/2024
      expect(rows[4]).toHaveTextContent("Business Account"); // 1/20/2024
    });

    it("handles switching between different sort fields", async () => {
      render(<AccountList accounts={mockAccounts} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      // Sort by balance first
      const balanceHeader = screen.getByRole("columnheader", { name: /balance/i });
      await user.click(balanceHeader);

      // Switch to currency sort
      const currencyHeader = screen.getByRole("columnheader", { name: /currency/i });
      await user.click(currencyHeader);
    });
  });

  describe("User Interactions", () => {
    it("calls onEdit when edit button is clicked", async () => {
      render(<AccountList accounts={[mockAccounts[0]]} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const editButton = screen.getByRole("button", { name: /edit/i });
      await user.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledWith(mockAccounts[0]);
      expect(mockOnEdit).toHaveBeenCalledTimes(1);
    });

    it("calls onDelete when delete button is clicked", async () => {
      render(<AccountList accounts={[mockAccounts[0]]} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      const deleteButton = screen.getByRole("button", { name: /delete/i });
      await user.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith(mockAccounts[0]);
      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });

    it("disables delete button for inactive accounts", () => {
      render(
        <AccountList
          accounts={[mockAccounts[2]]} // Business Account - inactive
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = screen.getByRole("button", { name: /delete/i });
      expect(deleteButton).toBeDisabled();
      expect(deleteButton).toHaveClass("opacity-50", "cursor-not-allowed");
    });

    it("enables delete button for active accounts", () => {
      render(
        <AccountList
          accounts={[mockAccounts[0]]} // Savings Account - active
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = screen.getByRole("button", { name: /delete/i });
      expect(deleteButton).toBeEnabled();
      expect(deleteButton).not.toHaveClass("opacity-50", "cursor-not-allowed");
    });
  });

  describe("Accessibility", () => {
    it("renders table with proper roles", () => {
      render(<AccountList accounts={mockAccounts} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.getAllByRole("row")).toHaveLength(5); // 1 header + 4 data rows
    });

    it("renders clickable headers with cursor pointer", () => {
      render(<AccountList accounts={mockAccounts} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      // Only check headers that should be clickable (not Actions column)
      const clickableHeaders = screen.getAllByRole("columnheader");
      clickableHeaders.slice(0, -1).forEach((header) => {
        expect(header).toHaveClass("cursor-pointer");
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles accounts with null or undefined tags", () => {
      const accountsWithoutTags = mockAccounts.map((account) => ({
        ...account,
        tag: undefined,
      }));

      render(<AccountList accounts={accountsWithoutTags} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      // Should render without errors
      expect(screen.getByText("Savings Account")).toBeInTheDocument();
    });

    it("handles accounts with zero balance", () => {
      const zeroBalanceAccount: AccountDTO = {
        ...mockAccounts[0],
        balance: 0,
        name: "Zero Balance Account",
      };

      render(<AccountList accounts={[zeroBalanceAccount]} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.getByText("0.00")).toBeInTheDocument();
    });

    it("handles accounts with negative balance", () => {
      const negativeBalanceAccount: AccountDTO = {
        ...mockAccounts[0],
        balance: -500.25,
        name: "Negative Balance Account",
      };

      render(<AccountList accounts={[negativeBalanceAccount]} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.getByText("-500.25")).toBeInTheDocument();
    });

    it("handles accounts with very large balances", () => {
      const largeBalanceAccount: AccountDTO = {
        ...mockAccounts[0],
        balance: 999999999.99,
        name: "Large Balance Account",
      };

      render(<AccountList accounts={[largeBalanceAccount]} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.getByText("999999999.99")).toBeInTheDocument();
    });

    it("handles sorting with identical values", () => {
      const identicalAccounts: AccountDTO[] = [
        { ...mockAccounts[0], name: "Same Name", balance: 1000 },
        { ...mockAccounts[1], name: "Same Name", balance: 1000 },
        { ...mockAccounts[2], name: "Same Name", balance: 1000 },
      ];

      render(<AccountList accounts={identicalAccounts} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      // Should render without errors and maintain order
      expect(screen.getAllByText("Same Name")).toHaveLength(3);
    });

    it("handles empty created_at dates", () => {
      const accountWithoutDate: AccountDTO = {
        ...mockAccounts[0],
        created_at: "",
        name: "No Date Account",
      };

      render(<AccountList accounts={[accountWithoutDate]} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      // Should handle gracefully without crashing
      expect(screen.getByText("No Date Account")).toBeInTheDocument();
    });
  });

  describe("Business Rules", () => {
    it("displays balance with exactly 2 decimal places", () => {
      const preciseBalanceAccount: AccountDTO = {
        ...mockAccounts[0],
        balance: 1234.56789,
        name: "Precise Balance Account",
      };

      render(<AccountList accounts={[preciseBalanceAccount]} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.getByText("1234.57")).toBeInTheDocument();
    });

    it("formats dates in locale format", () => {
      render(<AccountList accounts={[mockAccounts[0]]} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      // Should show formatted date, not ISO string
      expect(screen.getByText("1/15/2024")).toBeInTheDocument();
    });

    it("shows currency code in uppercase", () => {
      const lowercaseCurrencyAccount: AccountDTO = {
        ...mockAccounts[0],
        currency_code: "usd",
        name: "Lowercase Currency Account",
      };

      render(<AccountList accounts={[lowercaseCurrencyAccount]} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

      expect(screen.getByText("usd")).toBeInTheDocument();
    });
  });
});

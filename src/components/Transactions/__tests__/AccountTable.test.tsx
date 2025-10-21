import { describe, it, expect } from "vitest";
import { render, screen } from "../../../../tests/utils";
import AccountTable from "../AccountTable";
import type { AccountDTO } from "../../../types";

// Mock data
const mockAccounts: AccountDTO[] = [
  {
    id: 1,
    user_id: "user123",
    name: "Checking Account",
    currency_id: 1,
    currency_code: "USD",
    currency_description: "US Dollar",
    tag: "primary",
    balance: 1500.75,
    active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    user_id: "user123",
    name: "Savings Account",
    currency_id: 1,
    currency_code: "USD",
    currency_description: "US Dollar",
    tag: "savings",
    balance: 5000.0,
    active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 3,
    user_id: "user123",
    name: "Euro Account",
    currency_id: 2,
    currency_code: "EUR",
    currency_description: "Euro",
    tag: null,
    balance: -250.5,
    active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

const emptyAccounts: AccountDTO[] = [];

describe("AccountTable", () => {
  describe("Empty State", () => {
    it("renders empty state when no accounts provided", () => {
      render(<AccountTable accounts={emptyAccounts} />);

      expect(screen.getByTestId("account-table-empty")).toBeInTheDocument();
      expect(screen.getByText("No accounts found")).toBeInTheDocument();
      expect(screen.getByText("Create an account to get started.")).toBeInTheDocument();
    });
  });

  describe("Table Rendering", () => {
    it("renders table with correct structure", () => {
      render(<AccountTable accounts={mockAccounts} />);

      expect(screen.getByTestId("account-table")).toBeInTheDocument();
      expect(screen.getByTestId("account-table-element")).toBeInTheDocument();
    });

    it("renders table headers correctly", () => {
      render(<AccountTable accounts={mockAccounts} />);

      expect(screen.getByText("Account")).toBeInTheDocument();
      expect(screen.getByText("Balance")).toBeInTheDocument();
      expect(screen.getByText("Currency")).toBeInTheDocument();
    });

    it("renders all account rows with correct data", () => {
      render(<AccountTable accounts={mockAccounts} />);

      // Check account names
      expect(screen.getByText("Checking Account")).toBeInTheDocument();
      expect(screen.getByText("Savings Account")).toBeInTheDocument();
      expect(screen.getByText("Euro Account")).toBeInTheDocument();

      // Check currency codes
      expect(screen.getAllByText("USD")).toHaveLength(3); // Two accounts + one total
      expect(screen.getAllByText("EUR")).toHaveLength(2); // One account + one total

      // Check data-testid attributes for rows
      expect(screen.getByTestId("account-row-1")).toBeInTheDocument();
      expect(screen.getByTestId("account-row-2")).toBeInTheDocument();
      expect(screen.getByTestId("account-row-3")).toBeInTheDocument();
    });
  });

  describe("Balance Formatting", () => {
    it("formats positive balances with 2 decimal places", () => {
      render(<AccountTable accounts={[mockAccounts[0]]} />);

      // Check the balance in the account row, not the total
      const accountRow = screen.getByTestId("account-row-1");
      expect(accountRow).toHaveTextContent("1,500.75");
    });

    it("formats whole number balances with 2 decimal places", () => {
      render(<AccountTable accounts={[mockAccounts[1]]} />);

      // Check the balance in the account row, not the total
      const accountRow = screen.getByTestId("account-row-2");
      expect(accountRow).toHaveTextContent("5,000.00");
    });

    it("formats negative balances with 2 decimal places", () => {
      render(<AccountTable accounts={[mockAccounts[2]]} />);

      // Check the balance in the account row, not the total
      const accountRow = screen.getByTestId("account-row-3");
      expect(accountRow).toHaveTextContent("-250.50");
    });

    it("formats zero balance correctly", () => {
      const zeroBalanceAccount: AccountDTO = {
        ...mockAccounts[0],
        id: 4,
        name: "Zero Account",
        balance: 0,
      };

      render(<AccountTable accounts={[zeroBalanceAccount]} />);

      // Check the balance in the account row, not the total
      const accountRow = screen.getByTestId("account-row-4");
      expect(accountRow).toHaveTextContent("0.00");
    });
  });

  describe("Total Calculation", () => {
    it("calculates totals correctly for single currency", () => {
      const usdOnlyAccounts = mockAccounts.slice(0, 2); // Only USD accounts
      render(<AccountTable accounts={usdOnlyAccounts} />);

      expect(screen.getByTestId("account-total-USD")).toBeInTheDocument();
      expect(screen.getByText("6,500.75")).toBeInTheDocument(); // 1500.75 + 5000.00
    });

    it("calculates totals correctly for multiple currencies", () => {
      render(<AccountTable accounts={mockAccounts} />);

      // USD total: 1500.75 + 5000.00 = 6500.75
      const usdTotalRow = screen.getByTestId("account-total-USD");
      expect(usdTotalRow).toBeInTheDocument();
      expect(usdTotalRow).toHaveTextContent("6,500.75");

      // EUR total: -250.50
      const eurTotalRow = screen.getByTestId("account-total-EUR");
      expect(eurTotalRow).toBeInTheDocument();
      expect(eurTotalRow).toHaveTextContent("-250.50");
    });

    it("handles accounts with zero balance in totals", () => {
      const accountsWithZero = [
        { ...mockAccounts[0], balance: 100 }, // USD
        { ...mockAccounts[0], id: 4, balance: 0 }, // USD zero
        { ...mockAccounts[2], balance: 50 }, // EUR
      ];

      render(<AccountTable accounts={accountsWithZero} />);

      // USD total: 100 + 0 = 100.00
      const usdTotalRow = screen.getByTestId("account-total-USD");
      expect(usdTotalRow).toHaveTextContent("100.00");

      // EUR total: 50.00
      const eurTotalRow = screen.getByTestId("account-total-EUR");
      expect(eurTotalRow).toHaveTextContent("50.00");
    });

    it("displays 'Total' label for each currency total row", () => {
      render(<AccountTable accounts={mockAccounts} />);

      const totalLabels = screen.getAllByText("Total");
      expect(totalLabels).toHaveLength(2); // One for each currency
    });
  });

  describe("Accessibility", () => {
    it("has proper semantic table structure", () => {
      render(<AccountTable accounts={mockAccounts} />);

      const table = screen.getByRole("table");
      expect(table).toBeInTheDocument();

      const tableHeaders = screen.getAllByRole("columnheader");
      expect(tableHeaders).toHaveLength(3);

      const tableRows = screen.getAllByRole("row");
      expect(tableRows).toHaveLength(6); // 1 header + 3 data rows + 2 footer rows
    });
  });

  describe("Edge Cases", () => {
    it("handles single account correctly", () => {
      render(<AccountTable accounts={[mockAccounts[0]]} />);

      expect(screen.getByText("Checking Account")).toBeInTheDocument();
      const accountRow = screen.getByTestId("account-row-1");
      expect(accountRow).toHaveTextContent("1,500.75");
      expect(accountRow).toHaveTextContent("USD");

      // Should still show total
      expect(screen.getByTestId("account-total-USD")).toBeInTheDocument();
    });

    it("handles accounts with null tags (should not affect display)", () => {
      render(<AccountTable accounts={[mockAccounts[2]]} />);

      expect(screen.getByText("Euro Account")).toBeInTheDocument();
      const accountRow = screen.getByTestId("account-row-3");
      expect(accountRow).toHaveTextContent("-250.50");
      expect(accountRow).toHaveTextContent("EUR");
    });

    it("handles large numbers correctly", () => {
      const largeBalanceAccount: AccountDTO = {
        ...mockAccounts[0],
        balance: 1234567.89,
      };

      render(<AccountTable accounts={[largeBalanceAccount]} />);

      const accountRow = screen.getByTestId("account-row-1");
      expect(accountRow).toHaveTextContent("1,234,567.89");
    });

    it("handles decimal precision correctly", () => {
      const preciseDecimalAccount: AccountDTO = {
        ...mockAccounts[0],
        balance: 123.456, // More than 2 decimals
      };

      render(<AccountTable accounts={[preciseDecimalAccount]} />);

      // Should still format to exactly 2 decimal places
      const accountRow = screen.getByTestId("account-row-1");
      expect(accountRow).toHaveTextContent("123.46");
    });
  });

  describe("Styling and Layout", () => {
    it("applies correct CSS classes for styling", () => {
      render(<AccountTable accounts={mockAccounts} />);

      const container = screen.getByTestId("account-table");
      expect(container).toHaveClass("bg-white", "rounded-lg", "shadow", "overflow-hidden");
    });

    it("applies overflow styling to table container", () => {
      render(<AccountTable accounts={mockAccounts} />);

      const tableContainer = screen.getByTestId("account-table").querySelector(".overflow-x-auto");
      expect(tableContainer).toBeInTheDocument();
    });

    it("applies correct styling to table header", () => {
      render(<AccountTable accounts={mockAccounts} />);

      const headerRow = screen.getByText("Account").closest("tr");
      expect(headerRow).toHaveClass("bg-gray-50", "border-b");
    });

    it("applies correct styling to table rows", () => {
      render(<AccountTable accounts={mockAccounts} />);

      const firstRow = screen.getByTestId("account-row-1");
      expect(firstRow).toHaveClass("border-b");
    });

    it("applies correct styling to footer totals", () => {
      render(<AccountTable accounts={mockAccounts} />);

      const footer = document.querySelector("tfoot");
      expect(footer).toHaveClass("bg-gray-50");

      const totalCells = screen.getAllByText("Total");
      totalCells.forEach((cell) => {
        expect(cell).toHaveClass("font-medium");
      });
    });
  });
});

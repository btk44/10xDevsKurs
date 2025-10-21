import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "../../../../tests/utils";
import TransactionTable from "../TransactionTable";
import type { PaginationDTO, SortOption, TransactionDTO } from "../../../types";

describe("TransactionTable", () => {
  const mockOnPageChange = vi.fn();
  const mockOnSortChange = vi.fn();
  const mockOnEdit = vi.fn();
  const mockOnDeleteClick = vi.fn();

  const createMockTransaction = (overrides: Partial<TransactionDTO> = {}): TransactionDTO => ({
    id: 1,
    user_id: "user-1",
    transaction_date: "2024-01-15",
    account_id: 1,
    account_name: "Checking Account",
    category_id: 1,
    category_name: "Groceries",
    category_type: "expense",
    amount: 50.25,
    currency_id: 1,
    currency_code: "USD",
    comment: "Weekly groceries",
    active: true,
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
    ...overrides,
  });

  const createPaginationDTO = (page = 1, total_pages = 1): PaginationDTO => ({
    page,
    limit: 10,
    total_items: total_pages * 10,
    total_pages,
  });

  const defaultProps = {
    transactions: [],
    pagination: createPaginationDTO(),
    sort: "transaction_date:desc" as SortOption,
    onPageChange: mockOnPageChange,
    onSortChange: mockOnSortChange,
    onEdit: mockOnEdit,
    onDeleteClick: mockOnDeleteClick,
  };

  beforeEach(() => {
    mockOnPageChange.mockClear();
    mockOnSortChange.mockClear();
    mockOnEdit.mockClear();
    mockOnDeleteClick.mockClear();
  });

  describe("Empty State", () => {
    it("renders empty state when transactions array is empty", () => {
      render(<TransactionTable {...defaultProps} />);

      expect(screen.getByTestId("transaction-table-empty")).toBeInTheDocument();
      expect(screen.getByText("No transactions found")).toBeInTheDocument();
      expect(screen.getByText("Try adjusting your filters or add a new transaction.")).toBeInTheDocument();
    });

    it("does not render table when no transactions", () => {
      render(<TransactionTable {...defaultProps} />);

      expect(screen.queryByTestId("transaction-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("transaction-table-element")).not.toBeInTheDocument();
    });
  });

  describe("Table Rendering", () => {
    const transactions = [
      createMockTransaction({
        id: 1,
        transaction_date: "2024-01-15",
        account_name: "Checking Account",
        category_name: "Groceries",
        category_type: "expense",
        amount: 50.25,
        currency_code: "USD",
        comment: "Weekly groceries",
      }),
      createMockTransaction({
        id: 2,
        transaction_date: "2024-01-14",
        account_name: "Savings Account",
        category_name: "Salary",
        category_type: "income",
        amount: 2500.0,
        currency_code: "USD",
        comment: "Monthly salary",
      }),
    ];

    it("renders table with transactions", () => {
      render(<TransactionTable {...defaultProps} transactions={transactions} />);

      expect(screen.getByTestId("transaction-table")).toBeInTheDocument();
      expect(screen.getByTestId("transaction-table-element")).toBeInTheDocument();
    });

    it("renders correct number of rows", () => {
      render(<TransactionTable {...defaultProps} transactions={transactions} />);

      expect(screen.getByTestId("transaction-row-1")).toBeInTheDocument();
      expect(screen.getByTestId("transaction-row-2")).toBeInTheDocument();
    });

    it("renders table headers", () => {
      render(<TransactionTable {...defaultProps} transactions={transactions} />);

      // Check for header elements by their data-testid or by finding them in the table structure
      expect(screen.getByTestId("sort-date-header")).toBeInTheDocument();
      expect(screen.getByText("Account")).toBeInTheDocument();
      expect(screen.getByText("Category")).toBeInTheDocument();
      expect(screen.getByTestId("sort-amount-header")).toBeInTheDocument();
      expect(screen.getByText("Currency")).toBeInTheDocument();
      expect(screen.getByText("Comment")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });

    it("renders transaction data correctly", () => {
      render(<TransactionTable {...defaultProps} transactions={transactions} />);

      // First transaction
      expect(screen.getByText("1/15/2024")).toBeInTheDocument(); // formatted date
      expect(screen.getByText("Checking Account")).toBeInTheDocument();
      expect(screen.getByText("Groceries")).toBeInTheDocument();
      expect(screen.getByText("50.25")).toBeInTheDocument(); // formatted amount
      expect(screen.getByText("Weekly groceries")).toBeInTheDocument();

      // Second transaction
      expect(screen.getByText("1/14/2024")).toBeInTheDocument();
      expect(screen.getByText("Savings Account")).toBeInTheDocument();
      expect(screen.getByText("Salary")).toBeInTheDocument();
      expect(screen.getByText("2,500.00")).toBeInTheDocument();
      expect(screen.getByText("Monthly salary")).toBeInTheDocument();

      // Check that we have USD currency codes (multiple instances)
      const usdElements = screen.getAllByText("USD");
      expect(usdElements).toHaveLength(2);
    });
  });

  describe("Amount Formatting and Styling", () => {
    it("formats expense amounts with red color", () => {
      const expenseTransaction = createMockTransaction({
        category_type: "expense",
        amount: -75.5,
      });

      render(<TransactionTable {...defaultProps} transactions={[expenseTransaction]} />);

      const amountCell = screen.getByText("-75.50");
      expect(amountCell).toHaveClass("text-red-600");
    });

    it("formats income amounts with green color", () => {
      const incomeTransaction = createMockTransaction({
        category_type: "income",
        amount: 1500.0,
      });

      render(<TransactionTable {...defaultProps} transactions={[incomeTransaction]} />);

      const amountCell = screen.getByText("1,500.00");
      expect(amountCell).toHaveClass("text-green-600");
    });

    it("formats amounts with proper decimal places", () => {
      const transactions = [
        createMockTransaction({ amount: 0 }),
        createMockTransaction({ amount: 1.5 }),
        createMockTransaction({ amount: 100.123 }),
        createMockTransaction({ amount: 1000 }),
      ];

      render(<TransactionTable {...defaultProps} transactions={transactions} />);

      expect(screen.getByText("0.00")).toBeInTheDocument();
      expect(screen.getByText("1.50")).toBeInTheDocument();
      expect(screen.getByText("100.12")).toBeInTheDocument(); // rounded
      expect(screen.getByText("1,000.00")).toBeInTheDocument();
    });
  });

  describe("Sorting Functionality", () => {
    const transactions = [createMockTransaction()];

    it("shows sort indicator for current sort column", () => {
      render(<TransactionTable {...defaultProps} transactions={transactions} sort="transaction_date:desc" />);

      expect(screen.getByTestId("sort-date-header")).toHaveTextContent("Date ↓");
    });

    it("does not show sort indicator for unsorted columns", () => {
      render(<TransactionTable {...defaultProps} transactions={transactions} sort="transaction_date:desc" />);

      const amountHeader = screen.getByTestId("sort-amount-header");
      expect(amountHeader).toHaveTextContent("Amount");
      expect(amountHeader).not.toHaveTextContent("↑");
      expect(amountHeader).not.toHaveTextContent("↓");
    });

    it("toggles sort direction when clicking same column header", () => {
      render(<TransactionTable {...defaultProps} transactions={transactions} sort="transaction_date:desc" />);

      const dateHeader = screen.getByTestId("sort-date-header");
      fireEvent.click(dateHeader);

      expect(mockOnSortChange).toHaveBeenCalledWith("transaction_date:asc");
      expect(mockOnSortChange).toHaveBeenCalledTimes(1);
    });

    it("defaults to descending when clicking unsorted column header", () => {
      render(<TransactionTable {...defaultProps} transactions={transactions} sort="transaction_date:desc" />);

      const amountHeader = screen.getByTestId("sort-amount-header");
      fireEvent.click(amountHeader);

      expect(mockOnSortChange).toHaveBeenCalledWith("amount:desc");
      expect(mockOnSortChange).toHaveBeenCalledTimes(1);
    });

    it("makes headers clickable for sortable columns", () => {
      render(<TransactionTable {...defaultProps} transactions={transactions} />);

      const dateHeader = screen.getByTestId("sort-date-header");
      const amountHeader = screen.getByTestId("sort-amount-header");

      expect(dateHeader).toHaveClass("cursor-pointer");
      expect(amountHeader).toHaveClass("cursor-pointer");
    });
  });

  describe("Row Hover States", () => {
    const transactions = [createMockTransaction({ id: 1 }), createMockTransaction({ id: 2 })];

    it("applies hover background on mouse enter", () => {
      render(<TransactionTable {...defaultProps} transactions={transactions} />);

      const firstRow = screen.getByTestId("transaction-row-1");

      expect(firstRow).not.toHaveClass("bg-gray-50");

      fireEvent.mouseEnter(firstRow);

      expect(firstRow).toHaveClass("bg-gray-50");
    });

    it("removes hover background on mouse leave", () => {
      render(<TransactionTable {...defaultProps} transactions={transactions} />);

      const firstRow = screen.getByTestId("transaction-row-1");

      fireEvent.mouseEnter(firstRow);
      expect(firstRow).toHaveClass("bg-gray-50");

      fireEvent.mouseLeave(firstRow);
      expect(firstRow).not.toHaveClass("bg-gray-50");
    });

    it("tracks hovered row state correctly", () => {
      render(<TransactionTable {...defaultProps} transactions={transactions} />);

      const firstRow = screen.getByTestId("transaction-row-1");
      const secondRow = screen.getByTestId("transaction-row-2");

      // Initially no row is hovered
      expect(firstRow).not.toHaveClass("bg-gray-50");
      expect(secondRow).not.toHaveClass("bg-gray-50");

      // Hover first row
      fireEvent.mouseEnter(firstRow);
      expect(firstRow).toHaveClass("bg-gray-50");
      expect(secondRow).not.toHaveClass("bg-gray-50");

      // Hover second row (should replace first)
      fireEvent.mouseEnter(secondRow);
      expect(firstRow).not.toHaveClass("bg-gray-50");
      expect(secondRow).toHaveClass("bg-gray-50");
    });
  });

  describe("Action Buttons", () => {
    const transaction = createMockTransaction();

    it("renders edit and delete buttons for each transaction", () => {
      render(<TransactionTable {...defaultProps} transactions={[transaction]} />);

      expect(screen.getByTestId(`transaction-edit-button-${transaction.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`transaction-delete-button-${transaction.id}`)).toBeInTheDocument();
    });

    it("calls onEdit when edit button is clicked", () => {
      render(<TransactionTable {...defaultProps} transactions={[transaction]} />);

      const editButton = screen.getByTestId(`transaction-edit-button-${transaction.id}`);
      fireEvent.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledWith(transaction);
      expect(mockOnEdit).toHaveBeenCalledTimes(1);
    });

    it("calls onDeleteClick when delete button is clicked", () => {
      render(<TransactionTable {...defaultProps} transactions={[transaction]} />);

      const deleteButton = screen.getByTestId(`transaction-delete-button-${transaction.id}`);
      fireEvent.click(deleteButton);

      expect(mockOnDeleteClick).toHaveBeenCalledWith(transaction);
      expect(mockOnDeleteClick).toHaveBeenCalledTimes(1);
    });

    it("applies red styling to delete button", () => {
      render(<TransactionTable {...defaultProps} transactions={[transaction]} />);

      const deleteButton = screen.getByTestId(`transaction-delete-button-${transaction.id}`);

      expect(deleteButton).toHaveClass("text-red-600", "hover:text-red-800", "hover:bg-red-50");
    });
  });

  describe("Pagination Integration", () => {
    const transactions = [createMockTransaction()];

    it("renders pagination component", () => {
      render(<TransactionTable {...defaultProps} transactions={transactions} />);

      expect(screen.getByTestId("transaction-table-pagination")).toBeInTheDocument();
    });

    it("passes pagination props to Pagination component", () => {
      const customPagination = createPaginationDTO(2, 5);
      render(<TransactionTable {...defaultProps} transactions={transactions} pagination={customPagination} />);

      // The Pagination component should be rendered with the correct props
      // This test assumes the Pagination component renders its own test IDs
      expect(screen.getByTestId("transaction-table-pagination")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    const transaction = createMockTransaction();

    it("has proper ARIA labels for action buttons", () => {
      render(<TransactionTable {...defaultProps} transactions={[transaction]} />);

      const editButton = screen.getByTestId(`transaction-edit-button-${transaction.id}`);
      const deleteButton = screen.getByTestId(`transaction-delete-button-${transaction.id}`);

      expect(editButton).toHaveAttribute("aria-label", `Edit transaction ${transaction.id}`);
      expect(deleteButton).toHaveAttribute("aria-label", `Delete transaction ${transaction.id}`);
    });

    it("has proper test IDs for all interactive elements", () => {
      render(<TransactionTable {...defaultProps} transactions={[transaction]} />);

      expect(screen.getByTestId("transaction-table")).toBeInTheDocument();
      expect(screen.getByTestId("transaction-table-element")).toBeInTheDocument();
      expect(screen.getByTestId("transaction-table-pagination")).toBeInTheDocument();
      expect(screen.getByTestId("sort-date-header")).toBeInTheDocument();
      expect(screen.getByTestId("sort-amount-header")).toBeInTheDocument();
      expect(screen.getByTestId(`transaction-row-${transaction.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`transaction-edit-button-${transaction.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`transaction-delete-button-${transaction.id}`)).toBeInTheDocument();
    });

    it("has proper test ID for empty state", () => {
      render(<TransactionTable {...defaultProps} />);

      expect(screen.getByTestId("transaction-table-empty")).toBeInTheDocument();
    });
  });

  describe("Date Formatting", () => {
    it("formats dates correctly", () => {
      const transactions = [
        createMockTransaction({ transaction_date: "2024-01-15" }),
        createMockTransaction({ transaction_date: "2024-12-31" }),
        createMockTransaction({ transaction_date: "2024-02-29" }),
      ];

      render(<TransactionTable {...defaultProps} transactions={transactions} />);

      expect(screen.getByText("1/15/2024")).toBeInTheDocument();
      expect(screen.getByText("12/31/2024")).toBeInTheDocument();
      expect(screen.getByText("2/29/2024")).toBeInTheDocument();
    });

    it("handles different date formats consistently", () => {
      const transaction = createMockTransaction({ transaction_date: "2024-03-10T14:30:00Z" });

      render(<TransactionTable {...defaultProps} transactions={[transaction]} />);

      expect(screen.getByText("3/10/2024")).toBeInTheDocument();
    });
  });

  describe("Comment Display", () => {
    it("displays comments with truncate class", () => {
      const transaction = createMockTransaction({ comment: "This is a very long comment that should be truncated" });

      render(<TransactionTable {...defaultProps} transactions={[transaction]} />);

      const commentCell = screen.getByText("This is a very long comment that should be truncated");
      expect(commentCell).toHaveClass("truncate", "max-w-xs");
    });

    it("handles empty comments", () => {
      const transaction = createMockTransaction({ comment: "" });

      render(<TransactionTable {...defaultProps} transactions={[transaction]} />);

      // Check that the comment cell exists and has the correct classes
      const commentCell = screen.getByTestId("transaction-row-1").querySelector("td:nth-child(6)");
      expect(commentCell).toHaveClass("truncate", "max-w-xs");
      expect(commentCell).toHaveTextContent("");
    });

    it("handles null comments", () => {
      const transaction = createMockTransaction({ comment: null });

      render(<TransactionTable {...defaultProps} transactions={[transaction]} />);

      // Check that the comment cell exists and has the correct classes
      const commentCell = screen.getByTestId("transaction-row-1").querySelector("td:nth-child(6)");
      expect(commentCell).toHaveClass("truncate", "max-w-xs");
      expect(commentCell).toHaveTextContent("");
    });
  });
});

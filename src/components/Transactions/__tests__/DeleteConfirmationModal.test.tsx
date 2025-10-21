import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "../../../../tests/utils";
import DeleteConfirmationModal from "../DeleteConfirmationModal";
import type { TransactionDTO } from "../../../types";

// Mock data
const mockExpenseTransaction: TransactionDTO = {
  id: 1,
  user_id: "user123",
  transaction_date: "2024-10-15T00:00:00Z",
  account_id: 1,
  account_name: "Checking Account",
  category_id: 1,
  category_name: "Groceries",
  category_type: "expense",
  amount: 125.75,
  currency_id: 1,
  currency_code: "USD",
  comment: "Weekly grocery shopping",
  active: true,
  created_at: "2024-10-15T10:00:00Z",
  updated_at: "2024-10-15T10:00:00Z",
};

const mockIncomeTransaction: TransactionDTO = {
  id: 2,
  user_id: "user123",
  transaction_date: "2024-10-16T00:00:00Z",
  account_id: 2,
  account_name: "Savings Account",
  category_id: 2,
  category_name: "Salary",
  category_type: "income",
  amount: 3000.00,
  currency_id: 1,
  currency_code: "USD",
  comment: null,
  active: true,
  created_at: "2024-10-16T10:00:00Z",
  updated_at: "2024-10-16T10:00:00Z",
};

const mockTransactionWithoutComment: TransactionDTO = {
  ...mockExpenseTransaction,
  id: 3,
  comment: null,
};

describe("DeleteConfirmationModal", () => {
  const defaultProps = {
    transaction: mockExpenseTransaction,
    open: true,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    isDeleting: false,
    deleteError: undefined,
  };

  describe("Rendering Behavior", () => {
    it("returns null when no transaction is provided", () => {
      const { container } = render(
        <DeleteConfirmationModal
          {...defaultProps}
          transaction={null}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it("renders dialog when transaction is provided and open is true", () => {
      render(<DeleteConfirmationModal {...defaultProps} />);

      expect(screen.getByTestId("delete-transaction-modal-title")).toBeInTheDocument();
      expect(screen.getByTestId("delete-transaction-modal-description")).toBeInTheDocument();
      expect(screen.getByTestId("delete-transaction-modal-body")).toBeInTheDocument();
    });

    it("does not render when open is false", () => {
      render(<DeleteConfirmationModal {...defaultProps} open={false} />);

      expect(screen.queryByTestId("delete-transaction-modal-title")).not.toBeInTheDocument();
    });
  });

  describe("Dialog Content", () => {
    it("displays correct title and description", () => {
      render(<DeleteConfirmationModal {...defaultProps} />);

      expect(screen.getByTestId("delete-transaction-modal-title")).toHaveTextContent("Delete Transaction");
      expect(screen.getByTestId("delete-transaction-modal-description")).toHaveTextContent(
        "Are you sure you want to delete this transaction?"
      );
    });

    it("displays transaction details correctly", () => {
      render(<DeleteConfirmationModal {...defaultProps} />);

      // Check date formatting
      expect(screen.getByText("Date:")).toBeInTheDocument();
      expect(screen.getByText("10/15/2024")).toBeInTheDocument();

      // Check account
      expect(screen.getByText("Account:")).toBeInTheDocument();
      expect(screen.getByText("Checking Account")).toBeInTheDocument();

      // Check category
      expect(screen.getByText("Category:")).toBeInTheDocument();
      expect(screen.getByText("Groceries")).toBeInTheDocument();

      // Check amount
      expect(screen.getByText("Amount:")).toBeInTheDocument();
      expect(screen.getByText("125.75 USD")).toBeInTheDocument();
    });

    it("displays comment when present", () => {
      render(<DeleteConfirmationModal {...defaultProps} />);

      expect(screen.getByText("Comment:")).toBeInTheDocument();
      expect(screen.getByText("Weekly grocery shopping")).toBeInTheDocument();
    });

    it("does not display comment section when comment is null", () => {
      render(
        <DeleteConfirmationModal
          {...defaultProps}
          transaction={mockTransactionWithoutComment}
        />
      );

      expect(screen.queryByText("Comment:")).not.toBeInTheDocument();
    });

    it("does not display comment section when comment is empty string", () => {
      const transactionWithEmptyComment = { ...mockExpenseTransaction, comment: "" };

      render(
        <DeleteConfirmationModal
          {...defaultProps}
          transaction={transactionWithEmptyComment}
        />
      );

      expect(screen.queryByText("Comment:")).not.toBeInTheDocument();
    });
  });

  describe("Amount Formatting and Styling", () => {
    it("formats expense amounts with red color", () => {
      render(<DeleteConfirmationModal {...defaultProps} />);

      const amountElement = screen.getByText("125.75 USD");
      expect(amountElement).toHaveClass("text-red-600");
    });

    it("formats income amounts with green color", () => {
      render(
        <DeleteConfirmationModal
          {...defaultProps}
          transaction={mockIncomeTransaction}
        />
      );

      const amountElement = screen.getByText("3,000.00 USD");
      expect(amountElement).toHaveClass("text-green-600");
    });

    it("formats amounts with correct decimal places", () => {
      // Test various decimal formats
      const testCases = [
        { amount: 100, expected: "100.00 USD" },
        { amount: 100.5, expected: "100.50 USD" },
        { amount: 100.123, expected: "100.12 USD" },
        { amount: 1000.99, expected: "1,000.99 USD" },
      ];

      testCases.forEach(({ amount, expected }) => {
        const transaction = { ...mockExpenseTransaction, amount };
        render(<DeleteConfirmationModal {...defaultProps} transaction={transaction} />);

        expect(screen.getByText(expected)).toBeInTheDocument();
      });
    });
  });

  describe("Props Handling", () => {

    it("calls onCancel when cancel button is clicked", () => {
      const onCancel = vi.fn();
      render(<DeleteConfirmationModal {...defaultProps} onCancel={onCancel} />);

      const cancelButton = screen.getByTestId("delete-transaction-modal-cancel");
      fireEvent.click(cancelButton);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("calls onConfirm when delete button is clicked", () => {
      const onConfirm = vi.fn();
      render(<DeleteConfirmationModal {...defaultProps} onConfirm={onConfirm} />);

      const deleteButton = screen.getByTestId("delete-transaction-modal-confirm");
      fireEvent.click(deleteButton);

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("disables buttons when isDeleting is true", () => {
      render(<DeleteConfirmationModal {...defaultProps} isDeleting={true} />);

      const cancelButton = screen.getByTestId("delete-transaction-modal-cancel");
      const deleteButton = screen.getByTestId("delete-transaction-modal-confirm");

      expect(cancelButton).toBeDisabled();
      expect(deleteButton).toBeDisabled();
    });

    it("shows loading text when isDeleting is true", () => {
      render(<DeleteConfirmationModal {...defaultProps} isDeleting={true} />);

      const deleteButton = screen.getByTestId("delete-transaction-modal-confirm");
      expect(deleteButton).toHaveTextContent("Deleting...");
    });

    it("shows normal text when isDeleting is false", () => {
      render(<DeleteConfirmationModal {...defaultProps} isDeleting={false} />);

      const deleteButton = screen.getByTestId("delete-transaction-modal-confirm");
      expect(deleteButton).toHaveTextContent("Delete Transaction");
    });
  });

  describe("Error Handling", () => {
    it("displays string error message", () => {
      const errorMessage = "Failed to delete transaction";
      render(
        <DeleteConfirmationModal
          {...defaultProps}
          deleteError={errorMessage}
        />
      );

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it("displays Error object message", () => {
      const error = new Error("Network error occurred");
      render(
        <DeleteConfirmationModal
          {...defaultProps}
          deleteError={error}
        />
      );

      expect(screen.getByText("Network error occurred")).toBeInTheDocument();
    });

    it("applies correct error styling", () => {
      render(
        <DeleteConfirmationModal
          {...defaultProps}
          deleteError="Some error"
        />
      );

      const errorContainer = screen.getByText("Some error").closest("div");
      expect(errorContainer).toHaveClass("bg-red-50", "border-red-200", "text-red-700");
    });

    it("does not display error section when no error", () => {
      render(<DeleteConfirmationModal {...defaultProps} />);

      expect(screen.queryByText("bg-red-50")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper test IDs for testing", () => {
      render(<DeleteConfirmationModal {...defaultProps} />);

      expect(screen.getByTestId("delete-transaction-modal-title")).toBeInTheDocument();
      expect(screen.getByTestId("delete-transaction-modal-description")).toBeInTheDocument();
      expect(screen.getByTestId("delete-transaction-modal-body")).toBeInTheDocument();
      expect(screen.getByTestId("delete-transaction-modal-cancel")).toBeInTheDocument();
      expect(screen.getByTestId("delete-transaction-modal-confirm")).toBeInTheDocument();
    });

    it("uses semantic button elements", () => {
      render(<DeleteConfirmationModal {...defaultProps} />);

      const cancelButton = screen.getByTestId("delete-transaction-modal-cancel");
      const deleteButton = screen.getByTestId("delete-transaction-modal-confirm");

      expect(cancelButton.tagName).toBe("BUTTON");
      expect(deleteButton.tagName).toBe("BUTTON");
    });
  });

  describe("Edge Cases", () => {
    it("handles zero amount correctly", () => {
      const zeroAmountTransaction = { ...mockExpenseTransaction, amount: 0 };
      render(
        <DeleteConfirmationModal
          {...defaultProps}
          transaction={zeroAmountTransaction}
        />
      );

      expect(screen.getByText("0.00 USD")).toBeInTheDocument();
    });

    it("handles negative amounts correctly", () => {
      const negativeAmountTransaction = { ...mockExpenseTransaction, amount: -50.25 };
      render(
        <DeleteConfirmationModal
          {...defaultProps}
          transaction={negativeAmountTransaction}
        />
      );

      expect(screen.getByText("-50.25 USD")).toBeInTheDocument();
    });

    it("handles very large amounts correctly", () => {
      const largeAmountTransaction = { ...mockExpenseTransaction, amount: 1234567.89 };
      render(
        <DeleteConfirmationModal
          {...defaultProps}
          transaction={largeAmountTransaction}
        />
      );

      expect(screen.getByText("1,234,567.89 USD")).toBeInTheDocument();
    });

    it("handles different currency codes", () => {
      const eurTransaction = { ...mockExpenseTransaction, currency_code: "EUR", amount: 99.99 };
      render(
        <DeleteConfirmationModal
          {...defaultProps}
          transaction={eurTransaction}
        />
      );

      expect(screen.getByText("99.99 EUR")).toBeInTheDocument();
    });
  });
});

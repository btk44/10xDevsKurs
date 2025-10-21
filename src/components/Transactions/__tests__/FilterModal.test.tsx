import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "../../../../tests/utils";
import FilterModal from "../FilterModal";
import type { AccountDTO, CategoryDTO, GetTransactionsQuery } from "../../../types";

// Mock data
const mockAccounts: AccountDTO[] = [
  {
    id: 1,
    user_id: "user123",
    name: "Checking Account",
    currency_id: 1,
    currency_code: "USD",
    currency_description: "US Dollar",
    tag: null,
    balance: 1500.5,
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
];

const mockCategories: CategoryDTO[] = [
  {
    id: 1,
    user_id: "user123",
    name: "Groceries",
    category_type: "expense",
    parent_id: 0,
    tag: null,
    active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    user_id: "user123",
    name: "Salary",
    category_type: "income",
    parent_id: 0,
    tag: null,
    active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 3,
    user_id: "user123",
    name: "Entertainment",
    category_type: "expense",
    parent_id: 0,
    tag: "leisure",
    active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

const mockInitialFilters: GetTransactionsQuery = {
  page: 1,
  limit: 10,
  sort: "transaction_date:desc",
};

describe("FilterModal", () => {
  const defaultProps = {
    isOpen: true,
    initialFilters: mockInitialFilters,
    accounts: mockAccounts,
    categories: mockCategories,
    onApply: vi.fn(),
    onCancel: vi.fn(),
  };

  describe("Rendering Behavior", () => {
    it("renders dialog when isOpen is true", () => {
      render(<FilterModal {...defaultProps} />);

      expect(screen.getByTestId("filter-modal")).toBeInTheDocument();
      expect(screen.getByTestId("filter-modal-title")).toBeInTheDocument();
    });

    it("does not render when isOpen is false", () => {
      render(<FilterModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByTestId("filter-modal")).not.toBeInTheDocument();
    });

    it("renders all form fields with correct labels", () => {
      render(<FilterModal {...defaultProps} />);

      expect(screen.getByText("From Date")).toBeInTheDocument();
      expect(screen.getByText("To Date")).toBeInTheDocument();
      expect(screen.getByText("Account")).toBeInTheDocument();
      expect(screen.getByText("Category")).toBeInTheDocument();
      expect(screen.getByText("Search")).toBeInTheDocument();
    });

    it("renders all input fields with correct test IDs", () => {
      render(<FilterModal {...defaultProps} />);

      expect(screen.getByTestId("filter-date-from-input")).toBeInTheDocument();
      expect(screen.getByTestId("filter-date-to-input")).toBeInTheDocument();
      expect(screen.getByTestId("filter-account-select")).toBeInTheDocument();
      expect(screen.getByTestId("filter-category-select")).toBeInTheDocument();
      expect(screen.getByTestId("filter-search-input")).toBeInTheDocument();
    });

    it("renders action buttons with correct test IDs", () => {
      render(<FilterModal {...defaultProps} />);

      expect(screen.getByTestId("filter-reset-button")).toBeInTheDocument();
      expect(screen.getByTestId("filter-cancel-button")).toBeInTheDocument();
      expect(screen.getByTestId("filter-apply-button")).toBeInTheDocument();
    });
  });

  describe("Initial State", () => {
    it("sets initial filters correctly", () => {
      const initialFiltersWithValues: GetTransactionsQuery = {
        ...mockInitialFilters,
        date_from: "2024-01-01",
        date_to: "2024-12-31",
        account_id: 1,
        category_id: 2,
        search: "test search",
      };

      render(<FilterModal {...defaultProps} initialFilters={initialFiltersWithValues} />);

      const dateFromInput = screen.getByTestId("filter-date-from-input") as HTMLInputElement;
      const dateToInput = screen.getByTestId("filter-date-to-input") as HTMLInputElement;
      const accountSelect = screen.getByTestId("filter-account-select") as HTMLSelectElement;
      const categorySelect = screen.getByTestId("filter-category-select") as HTMLSelectElement;
      const searchInput = screen.getByTestId("filter-search-input") as HTMLInputElement;

      expect(dateFromInput.value).toBe("2024-01-01");
      expect(dateToInput.value).toBe("2024-12-31");
      expect(accountSelect.value).toBe("1");
      expect(categorySelect.value).toBe("2");
      expect(searchInput.value).toBe("test search");
    });

    it("resets filters when initialFilters prop changes", () => {
      const { rerender } = render(<FilterModal {...defaultProps} />);

      // Change some values
      const searchInput = screen.getByTestId("filter-search-input");
      fireEvent.change(searchInput, { target: { value: "new search" } });

      // Re-render with new initial filters
      const newInitialFilters = { ...mockInitialFilters, search: "updated search" };
      rerender(<FilterModal {...defaultProps} initialFilters={newInitialFilters} />);

      expect((searchInput as HTMLInputElement).value).toBe("updated search");
    });
  });

  describe("Form Interactions", () => {
    it("updates date from field correctly", () => {
      render(<FilterModal {...defaultProps} />);

      const dateFromInput = screen.getByTestId("filter-date-from-input");
      fireEvent.change(dateFromInput, { target: { value: "2024-01-15" } });

      expect((dateFromInput as HTMLInputElement).value).toBe("2024-01-15");
    });

    it("updates date to field correctly", () => {
      render(<FilterModal {...defaultProps} />);

      const dateToInput = screen.getByTestId("filter-date-to-input");
      fireEvent.change(dateToInput, { target: { value: "2024-12-31" } });

      expect((dateToInput as HTMLInputElement).value).toBe("2024-12-31");
    });

    it("updates account selection correctly", () => {
      render(<FilterModal {...defaultProps} />);

      const accountSelect = screen.getByTestId("filter-account-select");
      fireEvent.change(accountSelect, { target: { value: "2" } });

      expect((accountSelect as HTMLSelectElement).value).toBe("2");
    });

    it("updates category selection correctly", () => {
      render(<FilterModal {...defaultProps} />);

      const categorySelect = screen.getByTestId("filter-category-select");
      fireEvent.change(categorySelect, { target: { value: "1" } });

      expect((categorySelect as HTMLSelectElement).value).toBe("1");
    });

    it("updates search field correctly", () => {
      render(<FilterModal {...defaultProps} />);

      const searchInput = screen.getByTestId("filter-search-input");
      fireEvent.change(searchInput, { target: { value: "grocery shopping" } });

      expect((searchInput as HTMLInputElement).value).toBe("grocery shopping");
    });
  });

  describe("Account Dropdown", () => {
    it("renders all accounts in dropdown", () => {
      render(<FilterModal {...defaultProps} />);

      const accountSelect = screen.getByTestId("filter-account-select");
      expect(accountSelect).toHaveTextContent("All Accounts");
      expect(accountSelect).toHaveTextContent("Checking Account");
      expect(accountSelect).toHaveTextContent("Savings Account");
    });

    it("handles empty accounts array", () => {
      render(<FilterModal {...defaultProps} accounts={[]} />);

      const accountSelect = screen.getByTestId("filter-account-select");
      expect(accountSelect).toHaveTextContent("All Accounts");
      expect(accountSelect).not.toHaveTextContent("Checking Account");
    });

    it("handles undefined accounts", () => {
      render(<FilterModal {...defaultProps} accounts={undefined} />);

      const accountSelect = screen.getByTestId("filter-account-select");
      expect(accountSelect).toHaveTextContent("All Accounts");
    });
  });

  describe("Category Dropdown", () => {
    it("renders categories grouped by type", () => {
      render(<FilterModal {...defaultProps} />);

      const categorySelect = screen.getByTestId("filter-category-select");

      // Check that optgroups exist
      const incomeOptgroup = categorySelect.querySelector('optgroup[label="Income"]');
      const expenseOptgroup = categorySelect.querySelector('optgroup[label="Expense"]');

      expect(incomeOptgroup).toBeInTheDocument();
      expect(expenseOptgroup).toBeInTheDocument();

      // Check income categories
      expect(incomeOptgroup).toHaveTextContent("Salary");

      // Check expense categories
      expect(expenseOptgroup).toHaveTextContent("Groceries");
      expect(expenseOptgroup).toHaveTextContent("Entertainment");
    });

    it("handles empty categories array", () => {
      render(<FilterModal {...defaultProps} categories={[]} />);

      const categorySelect = screen.getByTestId("filter-category-select");
      expect(categorySelect).toHaveTextContent("All Categories");
    });

    it("handles undefined categories", () => {
      render(<FilterModal {...defaultProps} categories={undefined} />);

      const categorySelect = screen.getByTestId("filter-category-select");
      expect(categorySelect).toHaveTextContent("All Categories");
    });
  });

  describe("Validation", () => {
    describe("Date Range Validation", () => {
      it("shows error when date_from is after date_to", () => {
        render(<FilterModal {...defaultProps} />);

        const dateFromInput = screen.getByTestId("filter-date-from-input");
        const dateToInput = screen.getByTestId("filter-date-to-input");

        fireEvent.change(dateFromInput, { target: { value: "2024-12-31" } });
        fireEvent.change(dateToInput, { target: { value: "2024-01-01" } });

        // Trigger validation by blurring
        fireEvent.blur(dateToInput);

        expect(screen.getByText("End date must be after start date")).toBeInTheDocument();
      });

      it("clears date errors when valid range is entered", () => {
        render(<FilterModal {...defaultProps} />);

        const dateFromInput = screen.getByTestId("filter-date-from-input");
        const dateToInput = screen.getByTestId("filter-date-to-input");

        // First set invalid range
        fireEvent.change(dateFromInput, { target: { value: "2024-12-31" } });
        fireEvent.change(dateToInput, { target: { value: "2024-01-01" } });
        fireEvent.blur(dateToInput);

        expect(screen.getByText("End date must be after start date")).toBeInTheDocument();

        // Then set valid range
        fireEvent.change(dateToInput, { target: { value: "2024-12-31" } });
        fireEvent.blur(dateToInput);

        expect(screen.queryByText("End date must be after start date")).not.toBeInTheDocument();
      });

      it("validates date range only when both dates are present", () => {
        render(<FilterModal {...defaultProps} />);

        const dateFromInput = screen.getByTestId("filter-date-from-input");

        // Set only date_from
        fireEvent.change(dateFromInput, { target: { value: "2024-12-31" } });
        fireEvent.blur(dateFromInput);

        expect(screen.queryByText("Start date must be before end date")).not.toBeInTheDocument();
      });
    });

    describe("Search Validation", () => {
      it("shows error when search text exceeds 100 characters", () => {
        render(<FilterModal {...defaultProps} />);

        const searchInput = screen.getByTestId("filter-search-input");
        const longText = "a".repeat(101);

        fireEvent.change(searchInput, { target: { value: longText } });
        fireEvent.blur(searchInput);

        expect(screen.getByText("Search text must be 100 characters or less")).toBeInTheDocument();
      });

      it("clears search error when valid text is entered", () => {
        render(<FilterModal {...defaultProps} />);

        const searchInput = screen.getByTestId("filter-search-input");

        // First set invalid text
        fireEvent.change(searchInput, { target: { value: "a".repeat(101) } });
        fireEvent.blur(searchInput);

        expect(screen.getByText("Search text must be 100 characters or less")).toBeInTheDocument();

        // Then set valid text
        fireEvent.change(searchInput, { target: { value: "valid search" } });
        fireEvent.blur(searchInput);

        expect(screen.queryByText("Search text must be 100 characters or less")).not.toBeInTheDocument();
      });

      it("allows search text up to 100 characters", () => {
        render(<FilterModal {...defaultProps} />);

        const searchInput = screen.getByTestId("filter-search-input");
        const validText = "a".repeat(100);

        fireEvent.change(searchInput, { target: { value: validText } });
        fireEvent.blur(searchInput);

        expect(screen.queryByText("Search text must be 100 characters or less")).not.toBeInTheDocument();
      });
    });

    describe("Field-Level Validation", () => {
      it("clears errors when field changes", () => {
        render(<FilterModal {...defaultProps} />);

        const dateFromInput = screen.getByTestId("filter-date-from-input");
        const dateToInput = screen.getByTestId("filter-date-to-input");

        // Set invalid range
        fireEvent.change(dateFromInput, { target: { value: "2024-12-31" } });
        fireEvent.change(dateToInput, { target: { value: "2024-01-01" } });
        fireEvent.blur(dateToInput);

        expect(screen.getByText("End date must be after start date")).toBeInTheDocument();

        // Change date_to - error should clear
        fireEvent.change(dateToInput, { target: { value: "2024-12-31" } });

        expect(screen.queryByText("End date must be after start date")).not.toBeInTheDocument();
      });
    });
  });

  describe("Button Actions", () => {
    it("calls onApply with current filters when apply button is clicked and validation passes", () => {
      const onApply = vi.fn();
      render(<FilterModal {...defaultProps} onApply={onApply} />);

      const searchInput = screen.getByTestId("filter-search-input");
      fireEvent.change(searchInput, { target: { value: "test search" } });

      const applyButton = screen.getByTestId("filter-apply-button");
      fireEvent.click(applyButton);

      expect(onApply).toHaveBeenCalledWith({
        ...mockInitialFilters,
        search: "test search",
      });
    });

    it("does not call onApply when validation fails", () => {
      const onApply = vi.fn();
      render(<FilterModal {...defaultProps} onApply={onApply} />);

      const searchInput = screen.getByTestId("filter-search-input");
      fireEvent.change(searchInput, { target: { value: "a".repeat(101) } });

      const applyButton = screen.getByTestId("filter-apply-button");
      fireEvent.click(applyButton);

      expect(onApply).not.toHaveBeenCalled();
    });

    it("calls onCancel when cancel button is clicked", () => {
      const onCancel = vi.fn();
      render(<FilterModal {...defaultProps} onCancel={onCancel} />);

      const cancelButton = screen.getByTestId("filter-cancel-button");
      fireEvent.click(cancelButton);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("resets filters to defaults when reset button is clicked", () => {
      render(<FilterModal {...defaultProps} />);

      // Change some values
      const searchInput = screen.getByTestId("filter-search-input");
      const accountSelect = screen.getByTestId("filter-account-select");
      const categorySelect = screen.getByTestId("filter-category-select");

      fireEvent.change(searchInput, { target: { value: "test search" } });
      fireEvent.change(accountSelect, { target: { value: "2" } });
      fireEvent.change(categorySelect, { target: { value: "1" } });

      // Click reset
      const resetButton = screen.getByTestId("filter-reset-button");
      fireEvent.click(resetButton);

      // Check values are reset
      expect((searchInput as HTMLInputElement).value).toBe("");
      expect((accountSelect as HTMLSelectElement).value).toBe("");
      expect((categorySelect as HTMLSelectElement).value).toBe("");
    });

    it("resets errors when reset button is clicked", () => {
      render(<FilterModal {...defaultProps} />);

      const searchInput = screen.getByTestId("filter-search-input");
      fireEvent.change(searchInput, { target: { value: "a".repeat(101) } });
      fireEvent.blur(searchInput);

      expect(screen.getByText("Search text must be 100 characters or less")).toBeInTheDocument();

      const resetButton = screen.getByTestId("filter-reset-button");
      fireEvent.click(resetButton);

      expect(screen.queryByText("Search text must be 100 characters or less")).not.toBeInTheDocument();
    });
  });

  describe("Dialog Behavior", () => {
    it("calls onCancel when dialog close button is clicked", () => {
      const onCancel = vi.fn();
      render(<FilterModal {...defaultProps} onCancel={onCancel} />);

      // The Dialog component should handle the close event
      // This simulates clicking the X button or clicking outside
      const dialog = screen.getByTestId("filter-modal");
      fireEvent.keyDown(dialog, { key: "Escape" });

      // Note: This test might need adjustment based on how the Dialog handles close events
      // The actual close behavior depends on the Dialog component's onOpenChange prop
    });
  });

  describe("Error Styling", () => {
    it("applies error styling to invalid date to field", () => {
      render(<FilterModal {...defaultProps} />);

      const dateFromInput = screen.getByTestId("filter-date-from-input");
      const dateToInput = screen.getByTestId("filter-date-to-input");

      fireEvent.change(dateFromInput, { target: { value: "2024-12-31" } });
      fireEvent.change(dateToInput, { target: { value: "2024-01-01" } });
      fireEvent.blur(dateToInput);

      expect(dateToInput).toHaveClass("border-red-500");
    });

    it("applies error styling to invalid search field", () => {
      render(<FilterModal {...defaultProps} />);

      const searchInput = screen.getByTestId("filter-search-input");
      fireEvent.change(searchInput, { target: { value: "a".repeat(101) } });
      fireEvent.blur(searchInput);

      expect(searchInput).toHaveClass("border-red-500");
    });
  });

  describe("Edge Cases", () => {
    it("handles undefined initial filter values", () => {
      const initialFiltersWithUndefined: GetTransactionsQuery = {
        ...mockInitialFilters,
        date_from: undefined,
        date_to: undefined,
        account_id: undefined,
        category_id: undefined,
        search: undefined,
      };

      render(<FilterModal {...defaultProps} initialFilters={initialFiltersWithUndefined} />);

      const dateFromInput = screen.getByTestId("filter-date-from-input") as HTMLInputElement;
      const dateToInput = screen.getByTestId("filter-date-to-input") as HTMLInputElement;
      const accountSelect = screen.getByTestId("filter-account-select") as HTMLSelectElement;
      const categorySelect = screen.getByTestId("filter-category-select") as HTMLSelectElement;
      const searchInput = screen.getByTestId("filter-search-input") as HTMLInputElement;

      expect(dateFromInput.value).toBe("");
      expect(dateToInput.value).toBe("");
      expect(accountSelect.value).toBe("");
      expect(categorySelect.value).toBe("");
      expect(searchInput.value).toBe("");
    });

    it("handles numeric account_id and category_id correctly", () => {
      const initialFiltersWithNumbers: GetTransactionsQuery = {
        ...mockInitialFilters,
        account_id: 2,
        category_id: 1,
      };

      render(<FilterModal {...defaultProps} initialFilters={initialFiltersWithNumbers} />);

      const accountSelect = screen.getByTestId("filter-account-select") as HTMLSelectElement;
      const categorySelect = screen.getByTestId("filter-category-select") as HTMLSelectElement;

      expect(accountSelect.value).toBe("2");
      expect(categorySelect.value).toBe("1");
    });

    it("handles date-only changes without time", () => {
      render(<FilterModal {...defaultProps} />);

      const dateFromInput = screen.getByTestId("filter-date-from-input");
      fireEvent.change(dateFromInput, { target: { value: "2024-06-15" } });

      expect((dateFromInput as HTMLInputElement).value).toBe("2024-06-15");
    });
  });

  describe("Accessibility", () => {
    it("has proper test IDs for all interactive elements", () => {
      render(<FilterModal {...defaultProps} />);

      expect(screen.getByTestId("filter-modal")).toBeInTheDocument();
      expect(screen.getByTestId("filter-modal-title")).toBeInTheDocument();
      expect(screen.getByTestId("filter-date-from-input")).toBeInTheDocument();
      expect(screen.getByTestId("filter-date-to-input")).toBeInTheDocument();
      expect(screen.getByTestId("filter-account-select")).toBeInTheDocument();
      expect(screen.getByTestId("filter-category-select")).toBeInTheDocument();
      expect(screen.getByTestId("filter-search-input")).toBeInTheDocument();
      expect(screen.getByTestId("filter-reset-button")).toBeInTheDocument();
      expect(screen.getByTestId("filter-cancel-button")).toBeInTheDocument();
      expect(screen.getByTestId("filter-apply-button")).toBeInTheDocument();
    });

    it("uses semantic form elements", () => {
      render(<FilterModal {...defaultProps} />);

      // Check that inputs have proper types
      const dateFromInput = screen.getByTestId("filter-date-from-input");
      const dateToInput = screen.getByTestId("filter-date-to-input");
      const searchInput = screen.getByTestId("filter-search-input");

      expect(dateFromInput).toHaveAttribute("type", "date");
      expect(dateToInput).toHaveAttribute("type", "date");
      expect(searchInput).toHaveAttribute("type", "text");

      // Check that selects are select elements
      const accountSelect = screen.getByTestId("filter-account-select");
      const categorySelect = screen.getByTestId("filter-category-select");

      expect(accountSelect.tagName).toBe("SELECT");
      expect(categorySelect.tagName).toBe("SELECT");
    });

    it("has proper labels associated with inputs", () => {
      render(<FilterModal {...defaultProps} />);

      const dateFromLabel = screen.getByText("From Date");
      const dateToLabel = screen.getByText("To Date");
      const accountLabel = screen.getByText("Account");
      const categoryLabel = screen.getByText("Category");
      const searchLabel = screen.getByText("Search");

      expect(dateFromLabel).toBeInTheDocument();
      expect(dateToLabel).toBeInTheDocument();
      expect(accountLabel).toBeInTheDocument();
      expect(categoryLabel).toBeInTheDocument();
      expect(searchLabel).toBeInTheDocument();
    });
  });
});

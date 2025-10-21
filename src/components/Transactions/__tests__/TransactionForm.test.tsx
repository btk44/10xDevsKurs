import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "../../../../tests/utils";
import TransactionForm from "../TransactionForm";
import type {
  AccountDTO,
  CategoryDTO,
  CreateTransactionCommand,
  TransactionDTO,
  UpdateTransactionCommand,
} from "../../../types";

describe("TransactionForm", () => {
  // Mock functions
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();
  const mockOnDelete = vi.fn();

  // Test data factories
  const createMockAccount = (overrides: Partial<AccountDTO> = {}): AccountDTO => ({
    id: 1,
    user_id: "user-123",
    name: "Test Account",
    currency_id: 1,
    currency_code: "USD",
    currency_description: "US Dollar",
    tag: null,
    balance: 1000,
    active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  });

  const createMockCategory = (overrides: Partial<CategoryDTO> = {}): CategoryDTO => ({
    id: 1,
    user_id: "user-123",
    name: "Test Category",
    category_type: "expense" as const,
    parent_id: 0,
    tag: null,
    active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  });

  const createMockTransaction = (overrides: Partial<TransactionDTO> = {}): TransactionDTO => ({
    id: 1,
    user_id: "user-123",
    transaction_date: "2024-01-15T10:30:00Z",
    account_id: 1,
    category_id: 1,
    amount: 50,
    currency_id: 1,
    comment: "Test transaction",
    active: true,
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:30:00Z",
    account_name: "Test Account",
    category_name: "Test Category",
    category_type: "expense" as const,
    currency_code: "USD",
    ...overrides,
  });

  // Default props
  const defaultProps = {
    accounts: [createMockAccount()],
    categories: [
      createMockCategory({ id: 1, name: "Groceries", category_type: "expense" }),
      createMockCategory({ id: 2, name: "Salary", category_type: "income" }),
    ],
    initialData: null,
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
    onDelete: mockOnDelete,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering Behavior", () => {
    it("renders form correctly for new transaction", () => {
      render(<TransactionForm {...defaultProps} />);

      expect(screen.getByTestId("transaction-form")).toBeInTheDocument();
      expect(screen.getByTestId("transaction-form-title")).toHaveTextContent("New Transaction");
      expect(screen.getByTestId("transaction-form-element")).toBeInTheDocument();
      expect(screen.getByTestId("transaction-date-input")).toBeInTheDocument();
      expect(screen.getByTestId("transaction-account-select")).toBeInTheDocument();
      expect(screen.getByTestId("transaction-category-select")).toBeInTheDocument();
      expect(screen.getByTestId("transaction-amount-input")).toBeInTheDocument();
      expect(screen.getByTestId("transaction-comment-input")).toBeInTheDocument();
      expect(screen.getByTestId("transaction-submit-button")).toHaveTextContent("Save");
      expect(screen.getByTestId("transaction-cancel-button")).toHaveTextContent("Cancel");
    });

    it("renders form correctly for editing transaction", () => {
      const initialData = createMockTransaction();
      render(<TransactionForm {...defaultProps} initialData={initialData} />);

      expect(screen.getByTestId("transaction-form-title")).toHaveTextContent("Edit Transaction");
      expect(screen.getByTestId("transaction-submit-button")).toHaveTextContent("Update");
      expect(screen.getByTestId("transaction-delete-button")).toBeInTheDocument();
    });

    it("does not render delete button when onDelete is not provided", () => {
      const initialData = createMockTransaction();
      render(<TransactionForm {...defaultProps} initialData={initialData} onDelete={undefined} />);

      expect(screen.queryByTestId("transaction-delete-button")).not.toBeInTheDocument();
    });

    it("filters categories into income and expense groups", () => {
      render(<TransactionForm {...defaultProps} />);

      const categorySelect = screen.getByTestId("transaction-category-select");
      const optgroups = categorySelect.querySelectorAll("optgroup");

      expect(optgroups).toHaveLength(2);
      expect(optgroups[0]).toHaveAttribute("label", "Income");
      expect(optgroups[1]).toHaveAttribute("label", "Expense");

      // Check that income categories are in the first optgroup
      const incomeOptions = optgroups[0].querySelectorAll("option");
      expect(incomeOptions).toHaveLength(1);
      expect(incomeOptions[0]).toHaveTextContent("Salary");

      // Check that expense categories are in the second optgroup
      const expenseOptions = optgroups[1].querySelectorAll("option");
      expect(expenseOptions).toHaveLength(1);
      expect(expenseOptions[0]).toHaveTextContent("Groceries");
    });

    it("displays form fields with correct labels", () => {
      render(<TransactionForm {...defaultProps} />);

      expect(screen.getByText("Date *")).toBeInTheDocument();
      expect(screen.getByText("Account *")).toBeInTheDocument();
      expect(screen.getByText("Category *")).toBeInTheDocument();
      expect(screen.getByText("Amount *")).toBeInTheDocument();
      expect(screen.getByText("Comment")).toBeInTheDocument();
    });
  });

  describe("Form State Management", () => {
    it("initializes form data correctly for new transaction", () => {
      render(<TransactionForm {...defaultProps} />);

      const dateInput = screen.getByTestId("transaction-date-input") as HTMLInputElement;
      const accountSelect = screen.getByTestId("transaction-account-select") as HTMLSelectElement;
      const categorySelect = screen.getByTestId("transaction-category-select") as HTMLSelectElement;
      const amountInput = screen.getByTestId("transaction-amount-input") as HTMLInputElement;
      const commentInput = screen.getByTestId("transaction-comment-input") as HTMLInputElement;

      // Check default values
      expect(dateInput.value).toBe(new Date().toISOString().split("T")[0]);
      expect(accountSelect.value).toBe("");
      expect(categorySelect.value).toBe("");
      expect(amountInput.value).toBe("0");
      expect(commentInput.value).toBe("");
    });

    it("initializes form data correctly for editing transaction", () => {
      const initialData = createMockTransaction({
        transaction_date: "2024-01-15T10:30:00Z",
        account_id: 1,
        category_id: 1,
        amount: 123.45,
        comment: "Test comment",
      });

      render(<TransactionForm {...defaultProps} initialData={initialData} />);

      const dateInput = screen.getByTestId("transaction-date-input") as HTMLInputElement;
      const accountSelect = screen.getByTestId("transaction-account-select") as HTMLSelectElement;
      const categorySelect = screen.getByTestId("transaction-category-select") as HTMLSelectElement;
      const amountInput = screen.getByTestId("transaction-amount-input") as HTMLInputElement;
      const commentInput = screen.getByTestId("transaction-comment-input") as HTMLInputElement;

      expect(dateInput.value).toBe("2024-01-15");
      expect(accountSelect.value).toBe("1");
      expect(categorySelect.value).toBe("1");
      expect(amountInput.value).toBe("123.45");
      expect(commentInput.value).toBe("Test comment");
    });

    it("updates form data when input values change", () => {
      render(<TransactionForm {...defaultProps} />);

      const dateInput = screen.getByTestId("transaction-date-input");
      const amountInput = screen.getByTestId("transaction-amount-input");
      const commentInput = screen.getByTestId("transaction-comment-input");

      fireEvent.change(dateInput, { target: { value: "2024-02-01" } });
      fireEvent.change(amountInput, { target: { value: "99.99" } });
      fireEvent.change(commentInput, { target: { value: "Updated comment" } });

      expect((dateInput as HTMLInputElement).value).toBe("2024-02-01");
      expect((amountInput as HTMLInputElement).value).toBe("99.99");
      expect((commentInput as HTMLInputElement).value).toBe("Updated comment");
    });

    it("updates currency_id when account selection changes", () => {
      const accounts = [
        createMockAccount({ id: 1, currency_id: 1 }),
        createMockAccount({ id: 2, currency_id: 2, currency_code: "EUR" }),
      ];

      render(<TransactionForm {...defaultProps} accounts={accounts} />);

      const accountSelect = screen.getByTestId("transaction-account-select");
      const categorySelect = screen.getByTestId("transaction-category-select");
      const amountInput = screen.getByTestId("transaction-amount-input");
      const dateInput = screen.getByTestId("transaction-date-input");

      // Fill required fields and select second account
      fireEvent.change(dateInput, { target: { value: "2024-01-15" } });
      fireEvent.change(accountSelect, { target: { value: "2" } });
      fireEvent.change(categorySelect, { target: { value: "1" } });
      fireEvent.change(amountInput, { target: { value: "100" } });

      // Submit form to check the data
      const submitButton = screen.getByTestId("transaction-submit-button");
      fireEvent.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          account_id: 2,
          currency_id: 2,
        })
      );
    });

    it("handles numeric parsing for amount, account_id, category_id fields", () => {
      render(<TransactionForm {...defaultProps} />);

      const accountSelect = screen.getByTestId("transaction-account-select");
      const categorySelect = screen.getByTestId("transaction-category-select");
      const amountInput = screen.getByTestId("transaction-amount-input");

      fireEvent.change(accountSelect, { target: { value: "1" } });
      fireEvent.change(categorySelect, { target: { value: "1" } });
      fireEvent.change(amountInput, { target: { value: "123.45" } });

      const submitButton = screen.getByTestId("transaction-submit-button");
      fireEvent.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          account_id: 1,
          category_id: 1,
          amount: 123.45,
        })
      );
    });
  });

  describe("Form Validation", () => {
    it("prevents form submission when required fields are invalid", () => {
      render(<TransactionForm {...defaultProps} />);

      const submitButton = screen.getByTestId("transaction-submit-button");
      fireEvent.click(submitButton);

      // Form should not submit when validation fails
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("prevents form submission when amount is invalid", () => {
      render(<TransactionForm {...defaultProps} />);

      // Fill required fields with valid data except amount
      const dateInput = screen.getByTestId("transaction-date-input");
      const accountSelect = screen.getByTestId("transaction-account-select");
      const categorySelect = screen.getByTestId("transaction-category-select");
      const amountInput = screen.getByTestId("transaction-amount-input");

      fireEvent.change(dateInput, { target: { value: "2024-01-15" } });
      fireEvent.change(accountSelect, { target: { value: "1" } });
      fireEvent.change(categorySelect, { target: { value: "1" } });
      fireEvent.change(amountInput, { target: { value: "0" } });

      const submitButton = screen.getByTestId("transaction-submit-button");
      fireEvent.click(submitButton);

      // Form should not submit when amount is invalid
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("prevents form submission when comment is too long", () => {
      render(<TransactionForm {...defaultProps} />);

      // Fill required fields with valid data
      const dateInput = screen.getByTestId("transaction-date-input");
      const accountSelect = screen.getByTestId("transaction-account-select");
      const categorySelect = screen.getByTestId("transaction-category-select");
      const amountInput = screen.getByTestId("transaction-amount-input");
      const commentInput = screen.getByTestId("transaction-comment-input");

      fireEvent.change(dateInput, { target: { value: "2024-01-15" } });
      fireEvent.change(accountSelect, { target: { value: "1" } });
      fireEvent.change(categorySelect, { target: { value: "1" } });
      fireEvent.change(amountInput, { target: { value: "50" } });

      const longComment = "a".repeat(256);
      fireEvent.change(commentInput, { target: { value: longComment } });

      const submitButton = screen.getByTestId("transaction-submit-button");
      fireEvent.click(submitButton);

      // Form should not submit when comment is too long
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("shows validation errors for individual fields on blur", () => {
      render(<TransactionForm {...defaultProps} />);

      const amountInput = screen.getByTestId("transaction-amount-input");
      fireEvent.change(amountInput, { target: { value: "0" } });
      fireEvent.blur(amountInput);

      expect(screen.getByText("Amount must be greater than 0")).toBeInTheDocument();
    });

    it("clears validation errors when fields become valid", () => {
      render(<TransactionForm {...defaultProps} />);

      const amountInput = screen.getByTestId("transaction-amount-input");

      // First make it invalid
      fireEvent.change(amountInput, { target: { value: "0" } });
      fireEvent.blur(amountInput);
      expect(screen.getByText("Amount must be greater than 0")).toBeInTheDocument();

      // Then make it valid
      fireEvent.change(amountInput, { target: { value: "50" } });
      expect(screen.queryByText("Amount must be greater than 0")).not.toBeInTheDocument();
    });
  });

  describe("Form Submission", () => {
    it("calls onSubmit with correct data format for new transaction", () => {
      render(<TransactionForm {...defaultProps} />);

      const dateInput = screen.getByTestId("transaction-date-input");
      const accountSelect = screen.getByTestId("transaction-account-select");
      const categorySelect = screen.getByTestId("transaction-category-select");
      const amountInput = screen.getByTestId("transaction-amount-input");
      const commentInput = screen.getByTestId("transaction-comment-input");

      fireEvent.change(dateInput, { target: { value: "2024-01-15" } });
      fireEvent.change(accountSelect, { target: { value: "1" } });
      fireEvent.change(categorySelect, { target: { value: "1" } });
      fireEvent.change(amountInput, { target: { value: "123.45" } });
      fireEvent.change(commentInput, { target: { value: "Test comment" } });

      const submitButton = screen.getByTestId("transaction-submit-button");
      fireEvent.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      const submittedData = mockOnSubmit.mock.calls[0][0] as CreateTransactionCommand;

      // Check that all required fields are present with correct types
      expect(submittedData).toEqual(
        expect.objectContaining({
          transaction_date: expect.stringMatching(/^2024-01-15T\d{2}:\d{2}:\d{2}Z$/),
          account_id: 1,
          category_id: 1,
          amount: 123.45,
          currency_id: 1, // From account
          comment: "Test comment",
        })
      );
    });

    it("calls onSubmit with correct data format for editing transaction", () => {
      const initialData = createMockTransaction({
        transaction_date: "2024-01-15T10:30:00Z",
      });
      render(<TransactionForm {...defaultProps} initialData={initialData} />);

      const amountInput = screen.getByTestId("transaction-amount-input");
      fireEvent.change(amountInput, { target: { value: "200" } });

      const submitButton = screen.getByTestId("transaction-submit-button");
      fireEvent.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      const submittedData = mockOnSubmit.mock.calls[0][0] as UpdateTransactionCommand;

      // Check that the date preserves the original time structure
      expect(submittedData).toEqual(
        expect.objectContaining({
          transaction_date: expect.stringMatching(/^2024-01-15T\d{2}:30:00Z$/), // Preserves minutes/seconds
          account_id: 1,
          category_id: 1,
          amount: 200,
          currency_id: 1,
          comment: "Test transaction",
        })
      );
    });

    it("converts date to ISO format with time component", () => {
      render(<TransactionForm {...defaultProps} />);

      const dateInput = screen.getByTestId("transaction-date-input");
      const accountSelect = screen.getByTestId("transaction-account-select");
      const categorySelect = screen.getByTestId("transaction-category-select");
      const amountInput = screen.getByTestId("transaction-amount-input");

      fireEvent.change(dateInput, { target: { value: "2024-01-15" } });
      fireEvent.change(accountSelect, { target: { value: "1" } });
      fireEvent.change(categorySelect, { target: { value: "1" } });
      fireEvent.change(amountInput, { target: { value: "100" } });

      const submitButton = screen.getByTestId("transaction-submit-button");
      fireEvent.click(submitButton);

      const submittedData = mockOnSubmit.mock.calls[0][0];
      // Check that date has ISO format with time component
      expect(submittedData.transaction_date).toMatch(/^2024-01-15T\d{2}:\d{2}:\d{2}Z$/);
    });

    it("ensures currency_id is set correctly", () => {
      const accounts = [createMockAccount({ id: 1, currency_id: 2 })];

      render(<TransactionForm {...defaultProps} accounts={accounts} />);

      const accountSelect = screen.getByTestId("transaction-account-select");
      const categorySelect = screen.getByTestId("transaction-category-select");
      const amountInput = screen.getByTestId("transaction-amount-input");

      fireEvent.change(accountSelect, { target: { value: "1" } });
      fireEvent.change(categorySelect, { target: { value: "1" } });
      fireEvent.change(amountInput, { target: { value: "100" } });

      const submitButton = screen.getByTestId("transaction-submit-button");
      fireEvent.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          currency_id: 2, // Should match account's currency_id
        })
      );
    });

    it("only calls onSubmit when form validation passes", () => {
      render(<TransactionForm {...defaultProps} />);

      const submitButton = screen.getByTestId("transaction-submit-button");
      fireEvent.click(submitButton);

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe("User Interactions", () => {
    it("handles cancel button click", () => {
      render(<TransactionForm {...defaultProps} />);

      const cancelButton = screen.getByTestId("transaction-cancel-button");
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it("handles delete button click when editing", () => {
      const initialData = createMockTransaction();
      render(<TransactionForm {...defaultProps} initialData={initialData} />);

      const deleteButton = screen.getByTestId("transaction-delete-button");
      fireEvent.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith(initialData.id);
      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });

    it("handles input blur for field validation", () => {
      render(<TransactionForm {...defaultProps} />);

      const accountSelect = screen.getByTestId("transaction-account-select");
      fireEvent.blur(accountSelect);

      expect(screen.getByText("Account is required")).toBeInTheDocument();
    });

    it("clears errors when valid input is provided", () => {
      render(<TransactionForm {...defaultProps} />);

      const amountInput = screen.getByTestId("transaction-amount-input");

      // Make invalid
      fireEvent.change(amountInput, { target: { value: "0" } });
      fireEvent.blur(amountInput);
      expect(screen.getByText("Amount must be greater than 0")).toBeInTheDocument();

      // Make valid
      fireEvent.change(amountInput, { target: { value: "10" } });
      expect(screen.queryByText("Amount must be greater than 0")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper test IDs for all interactive elements", () => {
      render(<TransactionForm {...defaultProps} />);

      expect(screen.getByTestId("transaction-form")).toBeInTheDocument();
      expect(screen.getByTestId("transaction-form-title")).toBeInTheDocument();
      expect(screen.getByTestId("transaction-form-element")).toBeInTheDocument();
      expect(screen.getByTestId("transaction-date-input")).toBeInTheDocument();
      expect(screen.getByTestId("transaction-account-select")).toBeInTheDocument();
      expect(screen.getByTestId("transaction-category-select")).toBeInTheDocument();
      expect(screen.getByTestId("transaction-amount-input")).toBeInTheDocument();
      expect(screen.getByTestId("transaction-comment-input")).toBeInTheDocument();
      expect(screen.getByTestId("transaction-submit-button")).toBeInTheDocument();
      expect(screen.getByTestId("transaction-cancel-button")).toBeInTheDocument();
    });

    it("uses semantic HTML elements", () => {
      render(<TransactionForm {...defaultProps} />);

      const form = screen.getByTestId("transaction-form-element");
      expect(form.tagName).toBe("FORM");

      const inputs = screen.getAllByRole("textbox");
      expect(inputs.length).toBeGreaterThan(0);

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("has proper labels for form fields", () => {
      render(<TransactionForm {...defaultProps} />);

      const dateInput = screen.getByTestId("transaction-date-input");
      const accountSelect = screen.getByTestId("transaction-account-select");
      const categorySelect = screen.getByTestId("transaction-category-select");
      const amountInput = screen.getByTestId("transaction-amount-input");
      const commentInput = screen.getByTestId("transaction-comment-input");

      expect(dateInput).toHaveAttribute("id", "transaction_date");
      expect(accountSelect).toHaveAttribute("id", "account_id");
      expect(categorySelect).toHaveAttribute("id", "category_id");
      expect(amountInput).toHaveAttribute("id", "amount");
      expect(commentInput).toHaveAttribute("id", "comment");

      expect(screen.getByLabelText("Date *")).toBe(dateInput);
      expect(screen.getByLabelText("Account *")).toBe(accountSelect);
      expect(screen.getByLabelText("Category *")).toBe(categorySelect);
      expect(screen.getByLabelText("Amount *")).toBe(amountInput);
      expect(screen.getByLabelText("Comment")).toBe(commentInput);
    });
  });
});

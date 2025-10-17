import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../../../../tests/utils";
import userEvent from "@testing-library/user-event";
import AccountForm from "../AccountForm";
import type { AccountDTO, CurrencyDTO, ValidationErrorDetail } from "../../../types";

// Mock data
const mockCurrencies: CurrencyDTO[] = [
  { id: 1, code: "USD", description: "US Dollar", active: true },
  { id: 2, code: "EUR", description: "Euro", active: true },
  { id: 3, code: "GBP", description: "British Pound", active: true },
];

const mockAccount: AccountDTO = {
  id: 1,
  user_id: "user123",
  name: "Test Account",
  currency_id: 1,
  currency_code: "USD",
  currency_description: "US Dollar",
  balance: 1000.5,
  tag: "test",
  active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockErrors: ValidationErrorDetail[] = [
  { field: "name", message: "Name is required" },
  { field: "currency_id", message: "Currency must be valid" },
];

describe("AccountForm", () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Form Initialization", () => {
    it("initializes with default values for create mode", () => {
      render(
        <AccountForm
          account={null}
          currencies={mockCurrencies}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          errors={[]}
          isSaving={false}
        />
      );

      const nameInput = screen.getByLabelText(/account name/i);
      const currencySelect = screen.getByLabelText(/currency/i);
      const tagInput = screen.getByLabelText(/tag/i);

      expect(nameInput).toHaveValue("");
      expect(currencySelect).toHaveValue("1"); // First currency selected
      expect(tagInput).toHaveValue("");
    });

    it("initializes with account data for edit mode", () => {
      render(
        <AccountForm
          account={mockAccount}
          currencies={mockCurrencies}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          errors={[]}
          isSaving={false}
        />
      );

      const nameInput = screen.getByLabelText(/account name/i);
      const currencySelect = screen.getByLabelText(/currency/i);
      const tagInput = screen.getByLabelText(/tag/i);

      expect(nameInput).toHaveValue("Test Account");
      expect(currencySelect).toHaveValue("1");
      expect(tagInput).toHaveValue("test");
    });

    it("selects first currency when currencies array is empty", () => {
      render(
        <AccountForm
          account={null}
          currencies={[]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          errors={[]}
          isSaving={false}
        />
      );

      const currencySelect = screen.getByLabelText(/currency/i);
      expect(currencySelect).toHaveValue("");
    });
  });

  describe("Form Validation", () => {
    it("validates required name field", async () => {
      render(
        <AccountForm
          account={null}
          currencies={mockCurrencies}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          errors={[]}
          isSaving={false}
        />
      );

      const submitButton = screen.getByRole("button", { name: /create account/i });
      await user.click(submitButton);

      // Check that validation failed - onSave should not be called
      expect(mockOnSave).not.toHaveBeenCalled();

      // Check that error message appears
      await waitFor(() => {
        expect(screen.getByText("Name is required")).toBeInTheDocument();
      });
    });

    it("validates name length (too long)", async () => {
      render(
        <AccountForm
          account={null}
          currencies={mockCurrencies}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          errors={[]}
          isSaving={false}
        />
      );

      const nameInput = screen.getByLabelText(/account name/i);
      const longName = "a".repeat(101); // 101 characters
      await user.type(nameInput, longName);

      const submitButton = screen.getByRole("button", { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Name must be 100 characters or less")).toBeInTheDocument();
      });
    });

    it("validates required currency field", async () => {
      render(
        <AccountForm
          account={null}
          currencies={mockCurrencies}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          errors={[]}
          isSaving={false}
        />
      );

      // Set currency to empty
      const currencySelect = screen.getByLabelText(/currency/i);
      await user.selectOptions(currencySelect, "");

      const submitButton = screen.getByRole("button", { name: /create account/i });
      await user.click(submitButton);

      // Check that validation failed - onSave should not be called
      expect(mockOnSave).not.toHaveBeenCalled();

      // Check that error message appears
      await waitFor(() => {
        expect(screen.getByText("Currency is required")).toBeInTheDocument();
      });
    });

    it("validates tag length (too long)", async () => {
      render(
        <AccountForm
          account={null}
          currencies={mockCurrencies}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          errors={[]}
          isSaving={false}
        />
      );

      const nameInput = screen.getByLabelText(/account name/i);
      const tagInput = screen.getByLabelText(/tag/i);
      await user.type(nameInput, "Valid Name");
      // Set tag value programmatically to bypass maxlength restriction
      fireEvent.change(tagInput, { target: { value: "a".repeat(11) } }); // 11 characters

      const submitButton = screen.getByRole("button", { name: /create account/i });
      await user.click(submitButton);

      // Check that validation failed - onSave should not be called
      expect(mockOnSave).not.toHaveBeenCalled();

      // Check that error message appears
      await waitFor(() => {
        expect(screen.getByText("Tag must be 10 characters or less")).toBeInTheDocument();
      });
    });

    it("passes validation with valid data", async () => {
      render(
        <AccountForm
          account={null}
          currencies={mockCurrencies}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          errors={[]}
          isSaving={false}
        />
      );

      const nameInput = screen.getByLabelText(/account name/i);
      const currencySelect = screen.getByLabelText(/currency/i);

      await user.type(nameInput, "Valid Account Name");
      await user.selectOptions(currencySelect, "1");

      const submitButton = screen.getByRole("button", { name: /create account/i });
      await user.click(submitButton);

      expect(mockOnSave).toHaveBeenCalledWith({
        name: "Valid Account Name",
        currency_id: 1,
        tag: "",
      });
    });

    it("allows optional tag field to be empty", async () => {
      render(
        <AccountForm
          account={null}
          currencies={mockCurrencies}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          errors={[]}
          isSaving={false}
        />
      );

      const nameInput = screen.getByLabelText(/account name/i);
      const currencySelect = screen.getByLabelText(/currency/i);

      await user.type(nameInput, "Valid Account Name");
      await user.selectOptions(currencySelect, "1");

      const submitButton = screen.getByRole("button", { name: /create account/i });
      await user.click(submitButton);

      expect(mockOnSave).toHaveBeenCalledWith({
        name: "Valid Account Name",
        currency_id: 1,
        tag: "",
      });
    });
  });

  describe("Form State Management", () => {
    it("clears local errors when field is edited", async () => {
      render(
        <AccountForm
          account={null}
          currencies={mockCurrencies}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          errors={[]}
          isSaving={false}
        />
      );

      // Trigger validation error first
      const submitButton = screen.getByRole("button", { name: /create account/i });
      await user.click(submitButton);

      // Error should appear
      expect(screen.getByText("Name is required")).toBeInTheDocument();

      // Edit the field - error should clear
      const nameInput = screen.getByLabelText(/account name/i);
      await user.type(nameInput, "a");

      // Error should be cleared
      expect(screen.queryByText("Name is required")).not.toBeInTheDocument();
    });

    it("maps API errors to form fields", () => {
      render(
        <AccountForm
          account={null}
          currencies={mockCurrencies}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          errors={mockErrors}
          isSaving={false}
        />
      );

      expect(screen.getByText("Name is required")).toBeInTheDocument();
      expect(screen.getByText("Currency must be valid")).toBeInTheDocument();
    });

    it("resets form when account prop changes", () => {
      const { rerender } = render(
        <AccountForm
          account={mockAccount}
          currencies={mockCurrencies}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          errors={[]}
          isSaving={false}
        />
      );

      // Change to create mode
      rerender(
        <AccountForm
          account={null}
          currencies={mockCurrencies}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          errors={[]}
          isSaving={false}
        />
      );

      const nameInput = screen.getByLabelText(/account name/i);
      expect(nameInput).toHaveValue("");
    });
  });

  describe("Form Submission", () => {
    it("calls onSave with correct data for create mode", async () => {
      render(
        <AccountForm
          account={null}
          currencies={mockCurrencies}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          errors={[]}
          isSaving={false}
        />
      );

      const nameInput = screen.getByLabelText(/account name/i);
      const currencySelect = screen.getByLabelText(/currency/i);
      const tagInput = screen.getByLabelText(/tag/i);

      await user.type(nameInput, "New Account");
      await user.selectOptions(currencySelect, "2");
      await user.type(tagInput, "test");

      const submitButton = screen.getByRole("button", { name: /create account/i });
      await user.click(submitButton);

      expect(mockOnSave).toHaveBeenCalledWith({
        name: "New Account",
        currency_id: 2,
        tag: "test",
      });
    });

    it("calls onSave with correct data for edit mode", async () => {
      render(
        <AccountForm
          account={mockAccount}
          currencies={mockCurrencies}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          errors={[]}
          isSaving={false}
        />
      );

      const nameInput = screen.getByLabelText(/account name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Updated Account");

      const submitButton = screen.getByRole("button", { name: /update account/i });
      await user.click(submitButton);

      expect(mockOnSave).toHaveBeenCalledWith({
        name: "Updated Account",
        currency_id: 1,
        tag: "test",
      });
    });

    it("prevents submission when form is invalid", async () => {
      render(
        <AccountForm
          account={null}
          currencies={mockCurrencies}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          errors={[]}
          isSaving={false}
        />
      );

      const submitButton = screen.getByRole("button", { name: /create account/i });
      await user.click(submitButton);

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it("handles form submission with keyboard", async () => {
      render(
        <AccountForm
          account={null}
          currencies={mockCurrencies}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          errors={[]}
          isSaving={false}
        />
      );

      const nameInput = screen.getByLabelText(/account name/i);
      const currencySelect = screen.getByLabelText(/currency/i);

      await user.type(nameInput, "Keyboard Submit");
      await user.selectOptions(currencySelect, "1");

      const form = document.querySelector("form");
      if (form) {
        fireEvent.submit(form);
      } else {
        throw new Error("Form not found");
      }

      expect(mockOnSave).toHaveBeenCalledWith({
        name: "Keyboard Submit",
        currency_id: 1,
        tag: "",
      });
    });
  });

  describe("UI Behavior", () => {
    it("shows correct title for create mode", () => {
      render(
        <AccountForm
          account={null}
          currencies={mockCurrencies}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          errors={[]}
          isSaving={false}
        />
      );

      expect(screen.getByText("Create New Account")).toBeInTheDocument();
    });

    it("shows correct title for edit mode", () => {
      render(
        <AccountForm
          account={mockAccount}
          currencies={mockCurrencies}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          errors={[]}
          isSaving={false}
        />
      );

      expect(screen.getByText("Edit Account")).toBeInTheDocument();
    });

    it("enables submit button to allow validation on submission", () => {
      render(
        <AccountForm
          account={null}
          currencies={mockCurrencies}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          errors={[]}
          isSaving={false}
        />
      );

      const submitButton = screen.getByRole("button", { name: /create account/i });
      expect(submitButton).toBeEnabled();
    });

    it("enables submit button when form is valid", async () => {
      render(
        <AccountForm
          account={null}
          currencies={mockCurrencies}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          errors={[]}
          isSaving={false}
        />
      );

      const nameInput = screen.getByLabelText(/account name/i);
      const currencySelect = screen.getByLabelText(/currency/i);

      await user.type(nameInput, "Valid Name");
      await user.selectOptions(currencySelect, "1");

      const submitButton = screen.getByRole("button", { name: /create account/i });
      expect(submitButton).toBeEnabled();
    });

    it("shows loading state on submit button", () => {
      render(
        <AccountForm
          account={null}
          currencies={mockCurrencies}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          errors={[]}
          isSaving={true}
        />
      );

      expect(screen.getByRole("button", { name: /saving/i })).toBeInTheDocument();
    });

    it("calls onCancel when cancel button is clicked", async () => {
      render(
        <AccountForm
          account={null}
          currencies={mockCurrencies}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          errors={[]}
          isSaving={false}
        />
      );

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe("Accessibility", () => {
    it("associates error messages with form fields", async () => {
      render(
        <AccountForm
          account={null}
          currencies={mockCurrencies}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          errors={[]}
          isSaving={false}
        />
      );

      // Trigger validation error
      const submitButton = screen.getByRole("button", { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/account name/i);
        const errorMessage = screen.getByText("Name is required");

        expect(nameInput).toHaveAttribute("aria-invalid", "true");
        expect(errorMessage).toHaveAttribute("id");
        expect(nameInput).toHaveAttribute("aria-describedby", errorMessage.id);
      });
    });

    it("renders currency options with proper labels", () => {
      render(
        <AccountForm
          account={null}
          currencies={mockCurrencies}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          errors={[]}
          isSaving={false}
        />
      );

      const currencySelect = screen.getByLabelText(/currency/i);
      expect(currencySelect).toHaveDisplayValue("USD - US Dollar");
    });
  });

  describe("Edge Cases", () => {
    it("handles null tag value correctly", async () => {
      render(
        <AccountForm
          account={{ ...mockAccount, tag: null }}
          currencies={mockCurrencies}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          errors={[]}
          isSaving={false}
        />
      );

      const tagInput = screen.getByLabelText(/tag/i);
      expect(tagInput).toHaveValue("");
    });

    it("validates tag length with existing value", async () => {
      render(
        <AccountForm
          account={{ ...mockAccount, tag: "short" }}
          currencies={mockCurrencies}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          errors={[]}
          isSaving={false}
        />
      );

      const tagInput = screen.getByLabelText(/tag/i);
      // Set value programmatically to bypass maxlength restriction
      fireEvent.change(tagInput, { target: { value: "verylongtag" } }); // 11 characters

      const submitButton = screen.getByRole("button", { name: /update account/i });
      await user.click(submitButton);

      // Check that validation failed - onSave should not be called
      expect(mockOnSave).not.toHaveBeenCalled();

      // Check that error message appears
      await waitFor(() => {
        expect(screen.getByText("Tag must be 10 characters or less")).toBeInTheDocument();
      });
    });

    it("handles currency type conversion correctly", async () => {
      render(
        <AccountForm
          account={null}
          currencies={mockCurrencies}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          errors={[]}
          isSaving={false}
        />
      );

      const currencySelect = screen.getByLabelText(/currency/i);
      await user.selectOptions(currencySelect, "3"); // String value

      const nameInput = screen.getByLabelText(/account name/i);
      await user.type(nameInput, "Test");

      const submitButton = screen.getByRole("button", { name: /create account/i });
      await user.click(submitButton);

      expect(mockOnSave).toHaveBeenCalledWith({
        name: "Test",
        currency_id: 3, // Should be converted to number
        tag: "",
      });
    });
  });
});
